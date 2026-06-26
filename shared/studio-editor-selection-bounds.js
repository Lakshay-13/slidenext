(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorSelectionBounds = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function getStudioBoundableSelection(elements = [], options = {}) {
    const selection = Array.isArray(elements) ? elements : [];
    const isEligibleElement = typeof options.isEligibleElement === 'function'
      ? options.isEligibleElement
      : (element) => !!element && (typeof element.isConnected !== 'boolean' || element.isConnected);
    const isHidden = typeof options.isHidden === 'function'
      ? options.isHidden
      : () => false;

    return selection.filter((element) => isEligibleElement(element) && !isHidden(element));
  }

  function buildStudioSelectionBounds(elements = [], options = {}) {
    const selection = getStudioBoundableSelection(elements, options);
    if (selection.length === 0) {
      return null;
    }

    const getElementBounds = typeof options.getElementBounds === 'function'
      ? options.getElementBounds
      : () => null;
    const minSizePx = typeof options.minSizePx === 'number' ? options.minSizePx : 24;
    const rects = selection
      .map((element) => getElementBounds(element))
      .filter((rect) => rect
        && Number.isFinite(rect.left)
        && Number.isFinite(rect.top)
        && Number.isFinite(rect.right)
        && Number.isFinite(rect.bottom));

    if (rects.length === 0) {
      return null;
    }

    const left = Math.min(...rects.map((rect) => rect.left));
    const top = Math.min(...rects.map((rect) => rect.top));
    const right = Math.max(...rects.map((rect) => rect.right));
    const bottom = Math.max(...rects.map((rect) => rect.bottom));

    return {
      left,
      top,
      right,
      bottom,
      width: Math.max(minSizePx, right - left),
      height: Math.max(minSizePx, bottom - top)
    };
  }

  return {
    getStudioBoundableSelection,
    buildStudioSelectionBounds
  };
});
