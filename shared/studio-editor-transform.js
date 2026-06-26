(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorTransform = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function getStudioTransformSelection(elements = [], options = {}) {
    const selection = Array.isArray(elements) ? elements : [];
    const isEligibleElement = typeof options.isEligibleElement === 'function'
      ? options.isEligibleElement
      : (element) => !!element && (typeof element.isConnected !== 'boolean' || element.isConnected);

    return selection.filter((element) => isEligibleElement(element));
  }

  function buildStudioTransformSelectionState(elements = [], options = {}) {
    const selection = getStudioTransformSelection(elements, options);
    const isLocked = typeof options.isLocked === 'function'
      ? options.isLocked
      : () => false;
    const isFreeformPositioned = typeof options.isFreeformPositioned === 'function'
      ? options.isFreeformPositioned
      : () => false;

    return {
      selection,
      canTransform: selection.length > 0 && selection.every((element) => {
        return !isLocked(element) && isFreeformPositioned(element);
      })
    };
  }

  function canStudioTransformSelection(elements = [], options = {}) {
    return buildStudioTransformSelectionState(elements, options).canTransform;
  }

  return {
    getStudioTransformSelection,
    buildStudioTransformSelectionState,
    canStudioTransformSelection
  };
});
