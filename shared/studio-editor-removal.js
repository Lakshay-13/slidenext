(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorRemoval = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function getStudioRemovableSelection(elements = [], options = {}) {
    const selection = Array.isArray(elements) ? elements : [];
    const isEligibleElement = typeof options.isEligibleElement === 'function'
      ? options.isEligibleElement
      : (element) => !!element && (typeof element.isConnected !== 'boolean' || element.isConnected);

    return selection.filter((element) => {
      try {
        return isEligibleElement(element);
      } catch (error) {
        return false;
      }
    });
  }

  function buildStudioRemovalActionState(elements = [], options = {}) {
    const selection = getStudioRemovableSelection(elements, options);
    const isLocked = typeof options.isLocked === 'function'
      ? options.isLocked
      : () => false;
    const canMutateDeck = typeof options.canMutateDeck === 'function'
      ? options.canMutateDeck
      : () => true;
    const hasSelection = selection.length > 0;
    let deckReady = false;
    let hasLockedSelection = false;
    try {
      deckReady = canMutateDeck();
      hasLockedSelection = selection.some((element) => isLocked(element));
    } catch (error) {
      // Never remove elements when deck or canonical lock state is uncertain.
      deckReady = false;
      hasLockedSelection = true;
    }

    return {
      selection,
      hasSelection,
      canRemove: deckReady && hasSelection && !hasLockedSelection
    };
  }

  function createStudioRemovalActionStateBuilder(options = {}) {
    const getDocument = typeof options.getDocument === 'function'
      ? options.getDocument
      : () => null;
    const getSelectedElements = typeof options.getSelectedElements === 'function'
      ? options.getSelectedElements
      : () => [];
    const getActiveSlide = typeof options.getActiveSlide === 'function'
      ? options.getActiveSlide
      : () => null;
    const getLockedState = typeof options.getLockedState === 'function'
      ? options.getLockedState
      : () => () => false;

    return function buildStudioEditorRemovalActionState(doc = null) {
      const resolvedDoc = doc || getDocument();
      return buildStudioRemovalActionState(getSelectedElements(resolvedDoc), {
        isLocked: getLockedState(resolvedDoc),
        canMutateDeck: () => !!getActiveSlide(resolvedDoc)
      });
    };
  }

  function buildStudioRemovalToolbarState(elements = [], options = {}) {
    const actionState = buildStudioRemovalActionState(elements, options);

    return {
      ...actionState,
      buttonStates: {
        removeSelectionBtn: actionState.canRemove
      }
    };
  }

  function renderStudioRemovalToolbarState(options = {}) {
    const documentRef = options.documentRef;
    if (!documentRef || typeof documentRef.getElementById !== 'function') return false;
    const actionState = options.actionState || {};
    const buttonStates = actionState.buttonStates || {
      removeSelectionBtn: actionState.canRemove
    };
    Object.entries(buttonStates).forEach(([id, canRun]) => {
      const button = documentRef.getElementById(id);
      if (button) button.disabled = !canRun;
    });
    return true;
  }

  function syncStudioRemovalToolbarState(options = {}) {
    const actionState = buildStudioRemovalToolbarState(options.elements, {
      isLocked: options.isLocked,
      canMutateDeck: options.canMutateDeck
    });
    return renderStudioRemovalToolbarState({
      documentRef: options.documentRef,
      actionState
    });
  }

  function createStudioRemovalToolbarStateSync(options = {}) {
    const getDocument = typeof options.getDocument === 'function'
      ? options.getDocument
      : () => null;
    const getActionState = typeof options.getActionState === 'function'
      ? options.getActionState
      : () => ({ canRemove: false });
    const getDocumentRef = typeof options.getDocumentRef === 'function'
      ? options.getDocumentRef
      : () => options.documentRef || null;

    return function syncStudioEditorRemovalToolbarState(doc = null) {
      const resolvedDoc = doc || getDocument();
      try {
        const actionState = getActionState(resolvedDoc) || {};
        return renderStudioRemovalToolbarState({
          documentRef: getDocumentRef(),
          actionState
        });
      } catch (error) {
        return false;
      }
    };
  }

  function finalizeStudioRemovalActionResult(result, options = {}) {
    const updateRemovalActionState = typeof options.updateRemovalActionState === 'function'
      ? options.updateRemovalActionState
      : () => {};
    updateRemovalActionState(options.doc);
    return result;
  }

  function removeStudioElements(elements = [], options = {}) {
    const selection = Array.isArray(elements) ? elements : [];
    const removeElement = typeof options.removeElement === 'function'
      ? options.removeElement
      : (element) => {
          if (element && typeof element.remove === 'function') {
            element.remove();
          }
        };
    const createMarkupTransactionCapture = typeof options.createMarkupTransactionCapture === 'function'
      ? options.createMarkupTransactionCapture
      : null;
    const createElementPresenceTransaction = typeof options.createElementPresenceTransaction === 'function'
      ? options.createElementPresenceTransaction
      : null;
    const getElementId = typeof options.getElementId === 'function'
      ? options.getElementId
      : (element) => element && element.dataset && element.dataset.editorId;
    const resolveElementId = (element) => {
      if (!element) return '';
      try {
        return getElementId(element) || '';
      } catch (error) {
        return '';
      }
    };
    const markupCaptureTargets = [];
    if (createMarkupTransactionCapture) {
      const parentSet = new Set();
      selection.forEach((element) => {
        const parent = element && element.isConnected ? element.parentElement : null;
        if (!parent || parentSet.has(parent)) return;
        parentSet.add(parent);
        markupCaptureTargets.push({
          element: parent,
          elementId: getElementId(parent)
        });
      });
    }
    const liveSelection = selection.filter((element) => element && element.isConnected);
    const presenceItems = liveSelection.map((element) => {
      const parent = element.parentElement || element.parentNode;
      const childNodes = parent && (parent.children || parent.childNodes);
      const index = childNodes ? Array.prototype.indexOf.call(childNodes, element) : -1;
      return {
        elementId: resolveElementId(element),
        parentId: resolveElementId(parent),
        before: {
          exists: true,
          index,
          markup: typeof element.outerHTML === 'string' ? element.outerHTML : ''
        },
        after: { exists: false, index, markup: '' }
      };
    });
    const canUsePresenceTransaction = !!createElementPresenceTransaction
      && presenceItems.length > 0
      && presenceItems.every((item) => item.elementId
        && item.parentId
        && item.before.index >= 0
        && item.before.markup);
    const presenceTransaction = canUsePresenceTransaction
      ? createElementPresenceTransaction(presenceItems)
      : null;
    const markupCapture = !presenceTransaction && createMarkupTransactionCapture
      ? createMarkupTransactionCapture(markupCaptureTargets, { getElementId })
      : null;
    let removedCount = 0;
    selection.forEach((element) => {
      if (!element || !element.isConnected) return;
      removeElement(element);
      removedCount += 1;
    });

    return {
      didRemove: removedCount > 0,
      removedCount,
      transaction: presenceTransaction
        || (removedCount > 0 && markupCapture
          ? markupCapture.createTransaction()
          : null)
    };
  }

  return {
    getStudioRemovableSelection,
    buildStudioRemovalActionState,
    createStudioRemovalActionStateBuilder,
    buildStudioRemovalToolbarState,
    renderStudioRemovalToolbarState,
    syncStudioRemovalToolbarState,
    createStudioRemovalToolbarStateSync,
    finalizeStudioRemovalActionResult,
    removeStudioElements
  };
});
