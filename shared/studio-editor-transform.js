(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorTransform = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function canStudioTransformSelection(elements = [], options = {}) {
    const selection = Array.isArray(elements) ? elements : [];
    if (selection.length === 0) {
      return false;
    }

    const isEligibleElement = typeof options.isEligibleElement === 'function'
      ? options.isEligibleElement
      : (element) => !!element && (typeof element.isConnected !== 'boolean' || element.isConnected);
    const isLocked = typeof options.isLocked === 'function'
      ? options.isLocked
      : () => false;
    const isFreeformPositioned = typeof options.isFreeformPositioned === 'function'
      ? options.isFreeformPositioned
      : () => false;

    return selection.every((element) => {
      return isEligibleElement(element) && !isLocked(element) && isFreeformPositioned(element);
    });
  }

  return {
    canStudioTransformSelection
  };
});
