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

    return selection.filter((element) => isEligibleElement(element));
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
    const deckReady = canMutateDeck();

    return {
      selection,
      hasSelection,
      canRemove: deckReady && hasSelection && !selection.some((element) => isLocked(element))
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
    const getElementId = typeof options.getElementId === 'function'
      ? options.getElementId
      : (element) => element && element.dataset && element.dataset.editorId;
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
    const markupCapture = createMarkupTransactionCapture
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
      transaction: removedCount > 0 && markupCapture
        ? markupCapture.createTransaction()
        : null
    };
  }

  return {
    getStudioRemovableSelection,
    buildStudioRemovalActionState,
    buildStudioRemovalToolbarState,
    renderStudioRemovalToolbarState,
    syncStudioRemovalToolbarState,
    finalizeStudioRemovalActionResult,
    removeStudioElements
  };
});
