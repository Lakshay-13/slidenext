(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorClipboard = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function hasStudioClipboardItems(clipboard) {
    return !!(clipboard && Array.isArray(clipboard.items) && clipboard.items.length > 0);
  }

  function createStudioClipboardState(items = []) {
    return {
      items: Array.isArray(items) ? items : [],
      pasteCount: 0
    };
  }

  function buildStudioClipboardPastePlan(clipboard = null, options = {}) {
    const items = hasStudioClipboardItems(clipboard) ? clipboard.items : [];
    const pasteCount = Number.isFinite(clipboard && clipboard.pasteCount) ? clipboard.pasteCount : 0;
    const nextPasteCount = pasteCount + 1;
    const canMutateDeck = typeof options.canMutateDeck === 'function'
      ? options.canMutateDeck
      : () => true;
    const deckReady = canMutateDeck();

    return {
      canPaste: deckReady && items.length > 0,
      items,
      nextPasteCount,
      nextClipboard: items.length > 0
        ? {
          items,
          pasteCount: nextPasteCount
        }
        : null
    };
  }

  function getStudioClipboardSelection(elements = [], options = {}) {
    const selection = Array.isArray(elements) ? elements : [];
    const isEligibleElement = typeof options.isEligibleElement === 'function'
      ? options.isEligibleElement
      : (element) => !!element && (typeof element.isConnected !== 'boolean' || element.isConnected);
    const eligibleSelection = selection.filter((element) => isEligibleElement(element));
    const orderedElements = Array.isArray(options.orderedElements) ? options.orderedElements : null;

    if (!orderedElements) {
      return eligibleSelection;
    }
    return orderedElements.filter((element) => eligibleSelection.includes(element));
  }

  function canStudioCopySelection(elements = [], options = {}) {
    const eligibleSelection = getStudioClipboardSelection(elements, options);

    if (eligibleSelection.length === 0) {
      return false;
    }
    const isLocked = typeof options.isLocked === 'function'
      ? options.isLocked
      : () => false;
    return !eligibleSelection.some((element) => isLocked(element));
  }

  function buildStudioClipboardActionState(elements = [], clipboard = null, options = {}) {
    return buildStudioClipboardMutationPlan(elements, clipboard, options);
  }

  function buildStudioClipboardToolbarState(elements = [], clipboard = null, options = {}) {
    const actionState = buildStudioClipboardActionState(elements, clipboard, options);

    return {
      ...actionState,
      buttonStates: {
        copySelectionBtn: actionState.canCopy,
        pasteClipboardBtn: actionState.canPaste,
        slidePasteClipboardBtn: actionState.canPaste
      }
    };
  }

  function renderStudioClipboardToolbarState(options = {}) {
    const documentRef = options.documentRef;
    if (!documentRef || typeof documentRef.getElementById !== 'function') return false;
    const actionState = options.actionState || {};
    const buttonStates = actionState.buttonStates || {
      copySelectionBtn: actionState.canCopy,
      pasteClipboardBtn: actionState.canPaste,
      slidePasteClipboardBtn: actionState.canPaste
    };

    Object.entries(buttonStates).forEach(([id, canRun]) => {
      const button = documentRef.getElementById(id);
      if (button) button.disabled = !canRun;
    });
    return true;
  }

  function buildStudioClipboardSelectionMutationPlan(elements = [], clipboard = null, options = {}) {
    const clipboardMutationPlan = buildStudioClipboardMutationPlan(elements, clipboard, options);
    const buildPayloadItems = typeof options.buildPayloadItems === 'function'
      ? options.buildPayloadItems
      : () => [];
    const payloadItems = (clipboardMutationPlan.canCopy || clipboardMutationPlan.canDuplicate)
      ? buildPayloadItems(clipboardMutationPlan.selection, options)
      : [];
    const canBuildPayload = payloadItems.length > 0;

    return {
      ...clipboardMutationPlan,
      payloadItems,
      canBuildPayload,
      canCopy: clipboardMutationPlan.canCopy && canBuildPayload,
      canDuplicate: clipboardMutationPlan.canDuplicate && canBuildPayload
    };
  }

  function buildStudioClipboardMutationPlan(elements = [], clipboard = null, options = {}) {
    const selection = getStudioClipboardSelection(elements, options);
    const isLocked = typeof options.isLocked === 'function'
      ? options.isLocked
      : () => false;
    const canMutateDeck = typeof options.canMutateDeck === 'function'
      ? options.canMutateDeck
      : () => true;
    const deckReady = canMutateDeck();
    const canCopy = deckReady && selection.length > 0 && !selection.some((element) => isLocked(element));

    return {
      selection,
      canCopy,
      canDuplicate: canCopy,
      canPaste: buildStudioClipboardPastePlan(clipboard, {
        canMutateDeck
      }).canPaste
    };
  }

  function buildStudioClipboardPayloadItem(element, options = {}) {
    if (!element || typeof element.cloneNode !== 'function') {
      return null;
    }

    const sanitizeElement = typeof options.sanitizeElement === 'function'
      ? options.sanitizeElement
      : () => {};
    const hoverableClassName = options.hoverableClassName || 'editor-hoverable';
    const getComputedStyle = typeof options.getComputedStyle === 'function'
      ? options.getComputedStyle
      : element.ownerDocument && element.ownerDocument.defaultView && typeof element.ownerDocument.defaultView.getComputedStyle === 'function'
        ? element.ownerDocument.defaultView.getComputedStyle.bind(element.ownerDocument.defaultView)
        : null;
    const getClosestPositionedAncestor = typeof options.getClosestPositionedAncestor === 'function'
      ? options.getClosestPositionedAncestor
      : () => null;
    const buildPositionedLayoutItem = typeof options.buildPositionedLayoutItem === 'function'
      ? options.buildPositionedLayoutItem
      : () => null;
    const positionedLayoutOptions = options.positionedLayoutOptions || {};

    const template = element.cloneNode(true);
    sanitizeElement(template);
    if (template.classList && typeof template.classList.add === 'function') {
      template.classList.add(hoverableClassName);
    }

    const computed = getComputedStyle ? getComputedStyle(element) : null;
    const isAbsolutelyPositioned = !!computed && (computed.position === 'absolute' || computed.position === 'fixed');
    const sourceParent = getClosestPositionedAncestor(element);
    const item = {
      template,
      isAbsolutelyPositioned,
      sourceElement: element,
      sourceParent
    };

    if (!isAbsolutelyPositioned) {
      return item;
    }

    const layoutItem = buildPositionedLayoutItem(element, positionedLayoutOptions);
    if (!layoutItem) {
      return null;
    }

    return {
      ...item,
      startAbsLeft: layoutItem.absLeft,
      startAbsTop: layoutItem.absTop,
      width: layoutItem.width,
      height: layoutItem.height
    };
  }

  function buildStudioClipboardPayloadItems(elements = [], options = {}) {
    const selection = Array.isArray(elements) ? elements : [];
    const items = selection
      .map((element) => buildStudioClipboardPayloadItem(element, options))
      .filter(Boolean);

    return items.length === selection.length ? items : [];
  }

  function buildStudioClipboardInsertionPlan(items = [], offsetMultiplier = 1, options = {}) {
    const selection = Array.isArray(items) ? items : [];
    const slide = options.slide || null;
    const prepareElement = typeof options.prepareElement === 'function'
      ? options.prepareElement
      : () => {};
    const resolveInsertionTarget = typeof options.resolveInsertionTarget === 'function'
      ? options.resolveInsertionTarget
      : (item) => resolveStudioClipboardInsertionTarget(item, {
        slide,
        isConnected: options.isConnected,
        isOnActiveSlide: options.isOnActiveSlide
      });
    const getParentBoundsOnSlide = typeof options.getParentBoundsOnSlide === 'function'
      ? options.getParentBoundsOnSlide
      : () => null;

    const plans = selection.map((item) => {
      if (!item || !item.template || typeof item.template.cloneNode !== 'function') {
        return null;
      }

      const clone = item.template.cloneNode(true);
      prepareElement(clone);

      const insertionTarget = resolveInsertionTarget(item);
      if (!insertionTarget || !insertionTarget.mode) {
        return null;
      }

      if (insertionTarget.mode !== 'absolute') {
        return {
          clone,
          insertionTarget,
          absolutePlacement: null
        };
      }

      const parent = insertionTarget.parent || slide;
      const parentBoundsOnSlide = getParentBoundsOnSlide(parent);
      if (!parentBoundsOnSlide) {
        return null;
      }

      return {
        clone,
        insertionTarget,
        absolutePlacement: buildStudioClipboardAbsolutePlacement(item, offsetMultiplier, {
          offsetPx: options.offsetPx,
          slideWidth: options.slideWidth,
          slideHeight: options.slideHeight,
          parentLeft: parentBoundsOnSlide.left,
          parentTop: parentBoundsOnSlide.top
        })
      };
    });

    return plans.length === selection.length && plans.every(Boolean) ? plans : [];
  }

  function resolveStudioClipboardInsertionTarget(item = {}, options = {}) {
    const slide = options.slide || null;
    const isConnected = typeof options.isConnected === 'function'
      ? options.isConnected
      : (element) => !!element && (typeof element.isConnected !== 'boolean' || element.isConnected);
    const isOnActiveSlide = typeof options.isOnActiveSlide === 'function'
      ? options.isOnActiveSlide
      : () => false;

    if (item.isAbsolutelyPositioned) {
      const sourceParent = item.sourceParent;
      return {
        mode: 'absolute',
        parent: sourceParent && isConnected(sourceParent) && isOnActiveSlide(sourceParent)
          ? sourceParent
          : slide
      };
    }

    const sourceElement = item.sourceElement;
    if (sourceElement && isConnected(sourceElement) && isOnActiveSlide(sourceElement)) {
      return {
        mode: 'after-source',
        anchor: sourceElement,
        parent: slide
      };
    }

    return {
      mode: 'append-to-slide',
      parent: slide
    };
  }

  function buildStudioClipboardAbsolutePlacement(item = {}, offsetMultiplier = 1, options = {}) {
    const slideWidth = Number.isFinite(options.slideWidth) ? options.slideWidth : 0;
    const slideHeight = Number.isFinite(options.slideHeight) ? options.slideHeight : 0;
    const parentLeft = Number.isFinite(options.parentLeft) ? options.parentLeft : 0;
    const parentTop = Number.isFinite(options.parentTop) ? options.parentTop : 0;
    const offsetPx = Number.isFinite(options.offsetPx) ? options.offsetPx : 0;
    const normalizedOffsetMultiplier = Math.max(1, Number.isFinite(offsetMultiplier) ? offsetMultiplier : 1);
    const width = Number.isFinite(item.width) ? item.width : 0;
    const height = Number.isFinite(item.height) ? item.height : 0;
    const startAbsLeft = Number.isFinite(item.startAbsLeft) ? item.startAbsLeft : 0;
    const startAbsTop = Number.isFinite(item.startAbsTop) ? item.startAbsTop : 0;
    const nextAbsLeft = Math.max(0, Math.min(Math.max(0, slideWidth - width), startAbsLeft + (offsetPx * normalizedOffsetMultiplier)));
    const nextAbsTop = Math.max(0, Math.min(Math.max(0, slideHeight - height), startAbsTop + (offsetPx * normalizedOffsetMultiplier)));

    return {
      nextAbsLeft,
      nextAbsTop,
      nextLeft: nextAbsLeft - parentLeft,
      nextTop: nextAbsTop - parentTop
    };
  }

  function applyStudioClipboardInsertion(insertionPlans = [], options = {}) {
    const plans = Array.isArray(insertionPlans) ? insertionPlans : [];
    const slide = options.slide || null;
    const createMarkupTransactionCapture = typeof options.createMarkupTransactionCapture === 'function'
      ? options.createMarkupTransactionCapture
      : null;
    const getElementId = typeof options.getElementId === 'function'
      ? options.getElementId
      : (element) => element && element.dataset && element.dataset.editorId;
    if (!slide || plans.length === 0) {
      return {
        inserted: [],
        transaction: null
      };
    }

    const getInsertionParent = (insertionTarget = {}) => {
      if (insertionTarget.mode === 'absolute') {
        return insertionTarget.parent || slide;
      }
      if (insertionTarget.mode === 'after-source' && insertionTarget.anchor) {
        return insertionTarget.anchor.parentElement || slide;
      }
      return slide;
    };
    const markupCaptureTargets = [];
    if (createMarkupTransactionCapture) {
      const parentSet = new Set();
      plans.forEach(({ insertionTarget }) => {
        const parent = getInsertionParent(insertionTarget);
        if (!parent || parentSet.has(parent)) return;
        parentSet.add(parent);
        markupCaptureTargets.push({
          element: parent,
          elementId: getElementId(parent)
        });
      });
    }
    const markupCapture = createMarkupTransactionCapture
      ? createMarkupTransactionCapture(markupCaptureTargets, { getElementId })
      : null;
    const inserted = [];

    plans.forEach(({ clone, insertionTarget, absolutePlacement }) => {
      if (insertionTarget.mode === 'absolute' && absolutePlacement) {
        const parent = insertionTarget.parent || slide;
        clone.style.position = 'absolute';
        clone.style.margin = '0';
        clone.style.left = `${absolutePlacement.nextLeft}px`;
        clone.style.top = `${absolutePlacement.nextTop}px`;
        parent.appendChild(clone);
      } else if (insertionTarget.mode === 'after-source' && insertionTarget.anchor) {
        insertionTarget.anchor.insertAdjacentElement('afterend', clone);
      } else {
        slide.appendChild(clone);
      }
      inserted.push(clone);
    });

    return {
      inserted,
      transaction: markupCapture
        ? markupCapture.createTransaction()
        : null
    };
  }

  return {
    hasStudioClipboardItems,
    createStudioClipboardState,
    buildStudioClipboardPastePlan,
    getStudioClipboardSelection,
    canStudioCopySelection,
    buildStudioClipboardActionState,
    buildStudioClipboardToolbarState,
    renderStudioClipboardToolbarState,
    buildStudioClipboardSelectionMutationPlan,
    buildStudioClipboardMutationPlan,
    buildStudioClipboardPayloadItem,
    buildStudioClipboardPayloadItems,
    buildStudioClipboardInsertionPlan,
    resolveStudioClipboardInsertionTarget,
    buildStudioClipboardAbsolutePlacement,
    applyStudioClipboardInsertion
  };
});
