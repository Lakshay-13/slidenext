(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorOverlayState = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function getStudioVisibleSelection(elements = [], options = {}) {
    const selection = Array.isArray(elements) ? elements : [];
    const isEligibleElement = typeof options.isEligibleElement === 'function'
      ? options.isEligibleElement
      : (element) => !!element && (typeof element.isConnected !== 'boolean' || element.isConnected);
    const isHidden = typeof options.isHidden === 'function'
      ? options.isHidden
      : () => false;

    return selection.filter((element) => isEligibleElement(element) && !isHidden(element));
  }

  function buildStudioSelectionOverlayState(elements = [], options = {}) {
    const visibleSelection = getStudioVisibleSelection(elements, options);

    return {
      visibleSelection,
      hasVisibleSelection: visibleSelection.length > 0
    };
  }

  return {
    getStudioVisibleSelection,
    buildStudioSelectionOverlayState
  };
});
