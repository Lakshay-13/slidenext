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
    buildStudioLockMutationPlan
  };
});
