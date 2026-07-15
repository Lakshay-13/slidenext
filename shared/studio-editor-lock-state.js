(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorLockState = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function getStudioLockSelection(elements = [], options = {}) {
    const selection = Array.isArray(elements) ? elements : [];
    const isEligibleElement = typeof options.isEligibleElement === 'function'
      ? options.isEligibleElement
      : (element) => !!element && (typeof element.isConnected !== 'boolean' || element.isConnected);

    return selection.filter((element) => isEligibleElement(element));
  }

  function buildStudioLockActionState(elements = [], options = {}) {
    const selection = getStudioLockSelection(elements, options);
    const isLocked = typeof options.isLocked === 'function'
      ? options.isLocked
      : () => false;
    const canMutateDeck = typeof options.canMutateDeck === 'function'
      ? options.canMutateDeck
      : () => true;
    const hasSelection = selection.length > 0;
    const canToggle = canMutateDeck() && hasSelection;
    const hasLockedSelection = canToggle && selection.some((element) => isLocked(element));

    return {
      hasSelection,
      canToggle,
      allLocked: canToggle && selection.every((element) => isLocked(element)),
      canRemove: canToggle && !hasLockedSelection
    };
  }

  function buildStudioLockToolbarState(elements = [], options = {}) {
    const actionState = buildStudioLockActionState(elements, options);

    return {
      ...actionState,
      iconText: actionState.allLocked ? 'lock_open' : 'lock',
      labelText: actionState.allLocked ? 'Unlock Selected' : 'Lock Selected'
    };
  }

  function renderStudioLockToolbarState(options = {}) {
    const documentRef = options.documentRef;
    if (!documentRef || typeof documentRef.getElementById !== 'function') return false;
    const actionState = options.actionState || {};
    const button = documentRef.getElementById('toggleLockSelectionBtn');
    const icon = documentRef.getElementById('toggleLockSelectionIcon');
    const label = documentRef.getElementById('toggleLockSelectionLabel');
    if (button) button.disabled = !actionState.canToggle;
    if (icon) icon.textContent = actionState.iconText || (actionState.allLocked ? 'lock_open' : 'lock');
    if (label) label.textContent = actionState.labelText || (actionState.allLocked ? 'Unlock Selected' : 'Lock Selected');
    return true;
  }

  function buildStudioLockMutationPlan(elements = [], options = {}) {
    const selection = getStudioLockSelection(elements, options);
    const isLocked = typeof options.isLocked === 'function'
      ? options.isLocked
      : () => false;
    const canMutateDeck = typeof options.canMutateDeck === 'function'
      ? options.canMutateDeck
      : () => true;

    if (selection.length === 0 || !canMutateDeck()) {
      return {
        selection,
        shouldLock: false,
        didChange: false,
        versionLabel: ''
      };
    }

    const shouldLock = !selection.every((element) => isLocked(element));
    return {
      selection,
      shouldLock,
      didChange: true,
      versionLabel: shouldLock ? 'Auto: Locked Element' : 'Auto: Unlocked Element'
    };
  }

  return {
    getStudioLockSelection,
    buildStudioLockActionState,
    buildStudioLockToolbarState,
    renderStudioLockToolbarState,
    buildStudioLockMutationPlan
  };
});
