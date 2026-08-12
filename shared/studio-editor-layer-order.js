(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorLayerOrder = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function getStudioLayerOrderSelection(targetElements = [], options = {}) {
    const selection = Array.isArray(targetElements) ? targetElements : [];
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

  function buildStudioLayerOrderActionState(targetElements = [], options = {}) {
    const orderedElements = Array.isArray(options.orderedElements) ? options.orderedElements : [];
    const selection = getStudioLayerOrderSelection(targetElements, {
      ...options,
      orderedElements
    });
    const isLocked = typeof options.isLocked === 'function'
      ? options.isLocked
      : () => false;
    const canMutateDeck = typeof options.canMutateDeck === 'function'
      ? options.canMutateDeck
      : () => true;
    const hasSelection = selection.length > 0;
    const hasLockedSelection = selection.some((element) => isLocked(element));
    const canReorder = canMutateDeck() && hasSelection && !hasLockedSelection && orderedElements.length > 0;

    const canRunAction = (action) => {
      if (!canReorder) {
        return false;
      }
      return buildStudioReorderedLayerOrder(orderedElements, selection, action, options).didChange;
    };

    return {
      selection,
      hasSelection,
      hasLockedSelection,
      canReorder,
      canBringToFront: canRunAction('front'),
      canSendToBack: canRunAction('back'),
      canBringForward: canRunAction('forward'),
      canSendBackward: canRunAction('backward')
    };
  }

  function createStudioLayerOrderActionStateBuilder(options = {}) {
    const getDocument = typeof options.getDocument === 'function'
      ? options.getDocument
      : () => null;
    const getSelectedElements = typeof options.getSelectedElements === 'function'
      ? options.getSelectedElements
      : () => [];
    const getActiveSlide = typeof options.getActiveSlide === 'function'
      ? options.getActiveSlide
      : () => null;
    const getNormalizedSlideLayerOrder = typeof options.getNormalizedSlideLayerOrder === 'function'
      ? options.getNormalizedSlideLayerOrder
      : () => [];
    const getLockedState = typeof options.getLockedState === 'function'
      ? options.getLockedState
      : () => () => false;

    return function buildStudioEditorLayerOrderActionState(
      elements,
      actionOptions = {}
    ) {
      const hasDocOverride = Object.prototype.hasOwnProperty.call(actionOptions, 'doc');
      const resolvedDoc = hasDocOverride ? actionOptions.doc : getDocument();
      const resolvedElements = typeof elements === 'undefined'
        ? getSelectedElements(resolvedDoc)
        : elements;
      const hasSlideOverride = Object.prototype.hasOwnProperty.call(actionOptions, 'slide');
      const resolvedSlide = hasSlideOverride
        ? actionOptions.slide
        : getActiveSlide(resolvedDoc);
      const orderedElements = Array.isArray(actionOptions.orderedElements)
        ? actionOptions.orderedElements
        : (resolvedSlide ? getNormalizedSlideLayerOrder(resolvedSlide) : []);
      const canMutateDeck = typeof actionOptions.canMutateDeck === 'function'
        ? actionOptions.canMutateDeck
        : () => !!resolvedSlide;

      return buildStudioLayerOrderActionState(resolvedElements, {
        orderedElements,
        isLocked: typeof actionOptions.isLocked === 'function'
          ? actionOptions.isLocked
          : getLockedState(resolvedDoc),
        canMutateDeck
      });
    };
  }

  function buildStudioLayerOrderToolbarState(targetElements = [], options = {}) {
    const actionState = buildStudioLayerOrderActionState(targetElements, options);
    const buildZIndexMutationPlan = typeof options.buildZIndexMutationPlan === 'function'
      ? options.buildZIndexMutationPlan
      : null;
    const zIndexMutationPlan = buildZIndexMutationPlan
      ? buildZIndexMutationPlan(targetElements, options)
      : null;

    return {
      ...actionState,
      buttonStates: {
        arrangeLayerFrontBtn: actionState.canBringToFront,
        arrangeLayerBackBtn: actionState.canSendToBack,
        arrangeLayerForwardBtn: actionState.canBringForward,
        arrangeLayerBackwardBtn: actionState.canSendBackward
      },
      controlStates: {
        elZIndex: !!(zIndexMutationPlan && zIndexMutationPlan.canApply)
      }
    };
  }

  function renderStudioLayerOrderToolbarState(options = {}) {
    const documentRef = options.documentRef;
    if (!documentRef || typeof documentRef.getElementById !== 'function') return false;
    const actionState = options.actionState || {};
    const buttonStates = actionState.buttonStates || {
      arrangeLayerFrontBtn: actionState.canBringToFront,
      arrangeLayerBackBtn: actionState.canSendToBack,
      arrangeLayerForwardBtn: actionState.canBringForward,
      arrangeLayerBackwardBtn: actionState.canSendBackward
    };
    Object.entries(buttonStates).forEach(([id, canRun]) => {
      const button = documentRef.getElementById(id);
      if (button) button.disabled = !canRun;
    });

    const zIndexInput = documentRef.getElementById('elZIndex');
    if (zIndexInput) {
      const controlStates = actionState.controlStates || null;
      const hasControlState = controlStates
        && Object.prototype.hasOwnProperty.call(controlStates, 'elZIndex');
      if (hasControlState) {
        zIndexInput.disabled = !controlStates.elZIndex;
      } else if (typeof options.zIndexCanApply === 'boolean') {
        zIndexInput.disabled = !options.zIndexCanApply;
      }
    }
    return true;
  }

  function syncStudioLayerOrderZIndexInput(options = {}) {
    const target = options.target;
    if (!target) return null;
    const documentRef = options.documentRef;
    const zIndexInput = documentRef && typeof documentRef.getElementById === 'function'
      ? documentRef.getElementById('elZIndex')
      : null;
    const canonicalZIndex = options.canonicalTarget
      && options.canonicalTarget.layout
      && options.canonicalTarget.layout.zIndex;
    if (zIndexInput) {
      zIndexInput.value = Number.isFinite(canonicalZIndex)
        ? String(canonicalZIndex)
        : target.style && target.style.zIndex || 0;
    }
    return zIndexInput;
  }

  function syncStudioLayerOrderToolbarState(options = {}) {
    const canMutateDeck = typeof options.canMutateDeck === 'function'
      ? options.canMutateDeck
      : () => true;
    const actionState = buildStudioLayerOrderToolbarState(options.elements, {
      orderedElements: options.orderedElements,
      isLocked: options.isLocked,
      canMutateDeck,
      buildZIndexMutationPlan: options.buildZIndexMutationPlan
    });
    let zIndexCanApply;
    const zIndexInput = options.documentRef && typeof options.documentRef.getElementById === 'function'
      ? options.documentRef.getElementById('elZIndex')
      : null;
    if (zIndexInput) {
      const controlStates = actionState.controlStates || null;
      if (controlStates && Object.prototype.hasOwnProperty.call(controlStates, 'elZIndex')) {
        zIndexCanApply = !!controlStates.elZIndex;
      } else if (typeof options.buildZIndexMutationPlan === 'function') {
        const zIndexMutationPlan = options.buildZIndexMutationPlan(options.elements, {
          canMutateDeck,
          orderedElements: options.orderedElements
        });
        zIndexCanApply = !!(zIndexMutationPlan && zIndexMutationPlan.canApply);
      }
    }
    return renderStudioLayerOrderToolbarState({
      documentRef: options.documentRef,
      actionState,
      zIndexCanApply
    });
  }

  function buildStudioLayerOrderMutationPlan(targetElements = [], action, options = {}) {
    const orderedElements = Array.isArray(options.orderedElements) ? options.orderedElements : [];
    const actionState = buildStudioLayerOrderActionState(targetElements, {
      ...options,
      orderedElements
    });
    const actionAvailability = {
      front: actionState.canBringToFront,
      back: actionState.canSendToBack,
      forward: actionState.canBringForward,
      backward: actionState.canSendBackward
    };

    if (!actionAvailability[action]) {
      return {
        selection: actionState.selection,
        didChange: false,
        nextOrder: [...orderedElements]
      };
    }

    const reorderResult = buildStudioReorderedLayerOrder(orderedElements, actionState.selection, action, options);
    return {
      selection: actionState.selection,
      didChange: reorderResult.didChange,
      nextOrder: reorderResult.nextOrder
    };
  }

  function buildStudioReorderedLayerOrder(initialOrder = [], targetElements = [], action, options = {}) {
    const nextOrder = Array.isArray(initialOrder) ? [...initialOrder] : [];
    if (nextOrder.length === 0) {
      return {
        didChange: false,
        nextOrder
      };
    }

    const selection = getStudioLayerOrderSelection(targetElements, {
      ...options,
      orderedElements: nextOrder
    });
    if (selection.length === 0) {
      return {
        didChange: false,
        nextOrder
      };
    }

    const targetSet = new Set(selection);

    if (action === 'front') {
      nextOrder.splice(0, nextOrder.length, ...nextOrder.filter((element) => !targetSet.has(element)), ...selection);
    } else if (action === 'back') {
      nextOrder.splice(0, nextOrder.length, ...selection, ...nextOrder.filter((element) => !targetSet.has(element)));
    } else if (action === 'forward') {
      for (let index = nextOrder.length - 2; index >= 0; index -= 1) {
        if (targetSet.has(nextOrder[index]) && !targetSet.has(nextOrder[index + 1])) {
          [nextOrder[index], nextOrder[index + 1]] = [nextOrder[index + 1], nextOrder[index]];
        }
      }
    } else if (action === 'backward') {
      for (let index = 1; index < nextOrder.length; index += 1) {
        if (targetSet.has(nextOrder[index]) && !targetSet.has(nextOrder[index - 1])) {
          [nextOrder[index], nextOrder[index - 1]] = [nextOrder[index - 1], nextOrder[index]];
        }
      }
    } else {
      return {
        didChange: false,
        nextOrder
      };
    }

    const didChange = nextOrder.some((element, index) => element !== initialOrder[index]);
    return {
      didChange,
      nextOrder
    };
  }

  function applyStudioLayerOrderMutation(slide, initialOrder = [], nextOrder = [], options = {}) {
    const previousOrder = Array.isArray(initialOrder) ? initialOrder : [];
    const resolvedNextOrder = Array.isArray(nextOrder) ? nextOrder : [];
    const applyLayerOrder = typeof options.applyLayerOrder === 'function'
      ? options.applyLayerOrder
      : null;
    const createStyleTransaction = typeof options.createStyleTransaction === 'function'
      ? options.createStyleTransaction
      : null;
    const getElementId = typeof options.getElementId === 'function'
      ? options.getElementId
      : (element) => element && element.dataset && element.dataset.editorId;
    if (!slide || !applyLayerOrder || previousOrder.length === 0 || resolvedNextOrder.length === 0) {
      return {
        didApply: false,
        transaction: null
      };
    }

    const transactionItems = createStyleTransaction
      ? previousOrder.map((element) => ({
          element,
          elementId: getElementId(element),
          before: {
            zIndex: element && element.style ? element.style.zIndex : ''
          }
        }))
      : [];
    const applyResult = applyLayerOrder(slide, resolvedNextOrder);
    if (applyResult === false) {
      return {
        didApply: false,
        transaction: null
      };
    }

    transactionItems.forEach((item) => {
      item.after = {
        zIndex: item.element && item.element.style ? item.element.style.zIndex : ''
      };
    });
    return {
      didApply: true,
      transaction: createStyleTransaction
        ? createStyleTransaction(transactionItems, { getElementId })
        : null
    };
  }

  function applyStudioLayerOrderWithTransaction(slide, initialOrder = [], nextOrder = [], options = {}) {
    const applyStudioLayerOrderMutation = typeof options.applyStudioLayerOrderMutation === 'function'
      ? options.applyStudioLayerOrderMutation
      : null;
    const createStudioStyleTransaction = typeof options.createStudioStyleTransaction === 'function'
      ? options.createStudioStyleTransaction
      : null;
    const getElementId = typeof options.getElementId === 'function'
      ? options.getElementId
      : (element) => element && element.dataset && element.dataset.editorId;
    const applyLayerOrder = typeof options.applyLayerOrder === 'function'
      ? options.applyLayerOrder
      : null;

    if (applyStudioLayerOrderMutation) {
      const mutation = applyStudioLayerOrderMutation(slide, initialOrder, nextOrder, {
        applyLayerOrder,
        createStyleTransaction: createStudioStyleTransaction,
        getElementId
      });
      return mutation && typeof mutation === 'object'
        ? mutation
        : { didApply: false, transaction: null };
    }

    const transactionItems = createStudioStyleTransaction
      ? initialOrder.map((element) => ({
          element,
          elementId: getElementId(element),
          before: {
            zIndex: element && element.style ? element.style.zIndex : ''
          }
        }))
      : [];
    if (applyLayerOrder) {
      applyLayerOrder(slide, nextOrder);
    }
    transactionItems.forEach((item) => {
      item.after = {
        zIndex: item.element && item.element.style ? item.element.style.zIndex : ''
      };
    });
    return {
      didApply: true,
      transaction: createStudioStyleTransaction
        ? createStudioStyleTransaction(transactionItems, { getElementId })
        : null
    };
  }

  return {
    getStudioLayerOrderSelection,
    buildStudioLayerOrderActionState,
    createStudioLayerOrderActionStateBuilder,
    buildStudioLayerOrderToolbarState,
    renderStudioLayerOrderToolbarState,
    syncStudioLayerOrderZIndexInput,
    syncStudioLayerOrderToolbarState,
    buildStudioLayerOrderMutationPlan,
    buildStudioReorderedLayerOrder,
    applyStudioLayerOrderMutation,
    applyStudioLayerOrderWithTransaction
  };
});
