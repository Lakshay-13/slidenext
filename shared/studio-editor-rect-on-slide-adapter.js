(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorRectOnSlideAdapter = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function getStudioEditorRectOnSlide(rect, slideMetrics, options = {}) {
    const transformApi = options.transformApi && typeof options.transformApi === 'object'
      ? options.transformApi
      : null;
    const readRectOnSlide = typeof options.rectOnSlideReader === 'function'
      ? options.rectOnSlideReader
      : transformApi
        && typeof transformApi.getStudioRectOnSlide === 'function'
        ? transformApi.getStudioRectOnSlide
        : null;
    if (!readRectOnSlide) {
      return null;
    }
    return readRectOnSlide(rect, slideMetrics);
  }

  return {
    getStudioEditorRectOnSlide
  };
});
