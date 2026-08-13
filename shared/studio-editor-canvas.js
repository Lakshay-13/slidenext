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

  function readCanonicalCanvasSize(canonicalDeck) {
    const layout = canonicalDeck && canonicalDeck.layout;
    const size = layout && layout.size;
    const unit = typeof size?.unit === 'string' ? size.unit.trim().toLowerCase() : 'px';
    if (!size || (unit && unit !== 'px')) return null;

    const width = normalizeDimension(size.width, null);
    const height = normalizeDimension(size.height, null);
    return width !== null && height !== null ? { width, height } : null;
  }

  function resolveStudioCanvasDimensions(options = {}) {
    const documentRef = options.documentRef;
    const wrapper = options.wrapper || (documentRef && typeof documentRef.getElementById === 'function'
      ? documentRef.getElementById('canvasWrapper')
      : null);
    const wrapperWidth = readCanvasDimension(wrapper, 'clientWidth', 'width');
    const wrapperHeight = readCanvasDimension(wrapper, 'clientHeight', 'height');
    const canonicalSize = readCanonicalCanvasSize(options.canonicalDeck);

    return {
      width: normalizeDimension(
        options.width,
        canonicalSize?.width || wrapperWidth || DEFAULT_STUDIO_CANVAS_WIDTH_PX
      ),
      height: normalizeDimension(
        options.height,
        canonicalSize?.height || wrapperHeight || DEFAULT_STUDIO_CANVAS_HEIGHT_PX
      )
    };
  }

  function applyStudioCanvasDimensions(options = {}) {
    const documentRef = options.documentRef;
    const getElementById = documentRef && typeof documentRef.getElementById === 'function'
      ? documentRef.getElementById.bind(documentRef)
      : null;
    const wrapper = options.wrapper || (getElementById ? getElementById('canvasWrapper') : null);
    const frame = options.frame || (getElementById ? getElementById('studioFrame') : null);
    const scroller = options.scroller || (getElementById
      ? getElementById('canvasScrollContainer')
      : null);
    if (!wrapper && !frame && !scroller) {
      return { didApply: false, dimensions: resolveStudioCanvasDimensions(options) };
    }

    const dimensions = resolveStudioCanvasDimensions({
      ...options,
      wrapper
    });
    const zoomFactor = normalizeDimension(options.zoomFactor, 1);
    [wrapper, frame].forEach((element) => {
      if (!element || !element.style) return;
      element.style.width = `${dimensions.width}px`;
      element.style.height = `${dimensions.height}px`;
    });
    if (scroller && scroller.style) {
      scroller.style.width = `${dimensions.width * zoomFactor}px`;
      scroller.style.height = `${dimensions.height * zoomFactor}px`;
    }

    return { didApply: true, dimensions, zoomFactor };
  }

  function createStudioCanvasDimensionsSynchronizer(options = {}) {
    const getDocumentRef = typeof options.getDocumentRef === 'function'
      ? options.getDocumentRef
      : () => options.documentRef || null;
    const getCanonicalDeck = typeof options.getCanonicalDeck === 'function'
      ? options.getCanonicalDeck
      : () => null;
    const getZoomFactor = typeof options.getZoomFactor === 'function'
      ? options.getZoomFactor
      : () => 1;

    return function syncStudioCanvasDimensions() {
      let canonicalDeck = null;
      try {
        canonicalDeck = getCanonicalDeck();
      } catch (error) {
        canonicalDeck = null;
      }
      try {
        return applyStudioCanvasDimensions({
          documentRef: getDocumentRef(),
          canonicalDeck,
          zoomFactor: getZoomFactor()
        });
      } catch (error) {
        return { didApply: false };
      }
    };
  }

  return {
    DEFAULT_STUDIO_CANVAS_WIDTH_PX,
    DEFAULT_STUDIO_CANVAS_HEIGHT_PX,
    resolveStudioCanvasDimensions,
    applyStudioCanvasDimensions,
    createStudioCanvasDimensionsSynchronizer
  };
});
