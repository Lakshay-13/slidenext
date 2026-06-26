(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorVisibilityState = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function getStudioVisibilitySelection(elements = [], options = {}) {
    const selection = Array.isArray(elements) ? elements : [];
    const isEligibleElement = typeof options.isEligibleElement === 'function'
      ? options.isEligibleElement
      : (element) => !!element && (typeof element.isConnected !== 'boolean' || element.isConnected);

    return selection.filter((element) => isEligibleElement(element));
  }

  function buildStudioVisibilityActionState(elements = [], options = {}) {
    const selection = getStudioVisibilitySelection(elements, options);
    const isHidden = typeof options.isHidden === 'function'
      ? options.isHidden
      : () => false;
    const canMutateDeck = typeof options.canMutateDeck === 'function'
      ? options.canMutateDeck
      : () => true;
    const hasSelection = selection.length > 0;
    const canToggle = canMutateDeck() && hasSelection;

    return {
      hasSelection,
      canToggle,
      allHidden: canToggle && selection.every((element) => isHidden(element))
    };
  }

  function buildStudioVisibilityMutationPlan(elements = [], options = {}) {
    const selection = getStudioVisibilitySelection(elements, options);
    const isHidden = typeof options.isHidden === 'function'
      ? options.isHidden
      : () => false;
    const canMutateDeck = typeof options.canMutateDeck === 'function'
      ? options.canMutateDeck
      : () => true;

    if (selection.length === 0 || !canMutateDeck()) {
      return {
        selection,
        shouldHide: false,
        didChange: false,
        versionLabel: ''
      };
    }

    const shouldHide = !selection.every((element) => isHidden(element));
    return {
      selection,
      shouldHide,
      didChange: true,
      versionLabel: shouldHide ? 'Auto: Hid Element' : 'Auto: Showed Element'
    };
  }

  return {
    getStudioVisibilitySelection,
    buildStudioVisibilityActionState,
    buildStudioVisibilityMutationPlan
  };
});
