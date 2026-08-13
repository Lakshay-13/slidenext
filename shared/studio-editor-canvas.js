(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorCanvas = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const DEFAULT_STUDIO_CANVAS_WIDTH_PX = 1920;
  const DEFAULT_STUDIO_CANVAS_HEIGHT_PX = 1080;

  function normalizeDimension(value, fallback) {
    const numericValue = typeof value === 'number' ? value : Number.parseFloat(value);
    return Number.isFinite(numericValue) && numericValue > 0 ? numericValue : fallback;
  }

  function readCanvasDimension(element, propertyName, stylePropertyName) {
    if (!element) return null;
    const propertyValue = normalizeDimension(element[propertyName], null);
    if (propertyValue !== null) return propertyValue;
    return element.style
      ? normalizeDimension(element.style[stylePropertyName], null)
      : null;
  }

  function resolveStudioCanvasDimensions(options = {}) {
    const documentRef = options.documentRef;
    const wrapper = options.wrapper || (documentRef && typeof documentRef.getElementById === 'function'
      ? documentRef.getElementById('canvasWrapper')
      : null);
    const wrapperWidth = readCanvasDimension(wrapper, 'clientWidth', 'width');
    const wrapperHeight = readCanvasDimension(wrapper, 'clientHeight', 'height');

    return {
      width: normalizeDimension(
        options.width,
        wrapperWidth || DEFAULT_STUDIO_CANVAS_WIDTH_PX
      ),
      height: normalizeDimension(
        options.height,
        wrapperHeight || DEFAULT_STUDIO_CANVAS_HEIGHT_PX
      )
    };
  }

  return {
    DEFAULT_STUDIO_CANVAS_WIDTH_PX,
    DEFAULT_STUDIO_CANVAS_HEIGHT_PX,
    resolveStudioCanvasDimensions
  };
});
