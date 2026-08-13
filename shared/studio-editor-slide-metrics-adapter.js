(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorSlideMetricsAdapter = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function getStudioEditorSlideMetrics(slide, options = {}) {
    const transformApi = options.transformApi && typeof options.transformApi === 'object'
      ? options.transformApi
      : null;
    const readSlideMetrics = typeof options.slideMetricsReader === 'function'
      ? options.slideMetricsReader
      : transformApi
        && typeof transformApi.getStudioSlideMetrics === 'function'
        ? transformApi.getStudioSlideMetrics
        : null;
    if (!readSlideMetrics) {
      return null;
    }
    return readSlideMetrics(slide);
  }

  return {
    getStudioEditorSlideMetrics
  };
});
