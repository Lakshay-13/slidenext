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

  return {
    getStudioRemovableSelection,
    buildStudioRemovalActionState,
    buildStudioRemovalToolbarState,
    renderStudioRemovalToolbarState
  };
});
