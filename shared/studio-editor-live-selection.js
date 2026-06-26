(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorLiveSelection = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function getStudioLiveSelection(elements = [], options = {}) {
    const selection = Array.isArray(elements) ? elements : [];
    const isEligibleElement = typeof options.isEligibleElement === 'function'
      ? options.isEligibleElement
      : (element) => !!element && (typeof element.isConnected !== 'boolean' || element.isConnected);

    return selection.filter((element) => isEligibleElement(element));
  }

  function hasStudioLockedLiveSelection(elements = [], options = {}) {
    const selection = getStudioLiveSelection(elements, options);
    const isLocked = typeof options.isLocked === 'function'
      ? options.isLocked
      : () => false;

    return selection.some((element) => isLocked(element));
  }

  return {
    getStudioLiveSelection,
    hasStudioLockedLiveSelection
  };
});
