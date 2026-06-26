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
    const hasSelection = selection.length > 0;

    return {
      selection,
      hasSelection,
      canRemove: hasSelection && !selection.some((element) => isLocked(element))
    };
  }

  return {
    getStudioRemovableSelection,
    buildStudioRemovalActionState
  };
});
