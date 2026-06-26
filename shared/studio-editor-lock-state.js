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
    const hasSelection = selection.length > 0;
    const hasLockedSelection = selection.some((element) => isLocked(element));

    return {
      hasSelection,
      allLocked: hasSelection && selection.every((element) => isLocked(element)),
      canRemove: hasSelection && !hasLockedSelection
    };
  }

  return {
    getStudioLockSelection,
    buildStudioLockActionState
  };
});
