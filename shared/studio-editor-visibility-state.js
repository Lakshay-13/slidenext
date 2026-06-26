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
    const hasSelection = selection.length > 0;

    return {
      hasSelection,
      allHidden: hasSelection && selection.every((element) => isHidden(element))
    };
  }

  return {
    getStudioVisibilitySelection,
    buildStudioVisibilityActionState
  };
});
