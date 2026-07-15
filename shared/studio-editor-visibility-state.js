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

  function buildStudioVisibilityToolbarState(elements = [], options = {}) {
    const actionState = buildStudioVisibilityActionState(elements, options);

    return {
      ...actionState,
      iconText: actionState.allHidden ? 'visibility' : 'visibility_off',
      labelText: actionState.allHidden ? 'Show Selected' : 'Hide Selected'
    };
  }

  function renderStudioVisibilityToolbarState(options = {}) {
    const documentRef = options.documentRef;
    if (!documentRef || typeof documentRef.getElementById !== 'function') return false;
    const actionState = options.actionState || {};
    const button = documentRef.getElementById('toggleVisibilitySelectionBtn');
    const icon = documentRef.getElementById('toggleVisibilitySelectionIcon');
    const label = documentRef.getElementById('toggleVisibilitySelectionLabel');
    if (button) button.disabled = !actionState.canToggle;
    if (icon) icon.textContent = actionState.iconText || (actionState.allHidden ? 'visibility' : 'visibility_off');
    if (label) label.textContent = actionState.labelText || (actionState.allHidden ? 'Show Selected' : 'Hide Selected');
    return true;
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
    buildStudioVisibilityToolbarState,
    renderStudioVisibilityToolbarState,
    buildStudioVisibilityMutationPlan
  };
});
