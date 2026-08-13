(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorPointerOnSlideAdapter = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function getStudioEditorPointerOnSlide(event, slideMetrics, options = {}) {
    const transformApi = options.transformApi && typeof options.transformApi === 'object'
      ? options.transformApi
      : null;
    const readPointerOnSlide = typeof options.pointerOnSlideReader === 'function'
      ? options.pointerOnSlideReader
      : transformApi
        && typeof transformApi.getStudioPointerOnSlide === 'function'
        ? transformApi.getStudioPointerOnSlide
        : null;
    if (!readPointerOnSlide) {
      return null;
    }
    return readPointerOnSlide(event, slideMetrics);
  }

  return {
    getStudioEditorPointerOnSlide
  };
});
