(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorActiveSlideAdapter = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function getStudioEditorActiveSlide(doc, options = {}) {
    const domApi = options.domApi && typeof options.domApi === 'object'
      ? options.domApi
      : null;
    const resolveActiveSlide = typeof options.activeSlideResolver === 'function'
      ? options.activeSlideResolver
      : domApi
        && typeof domApi.getStudioActiveSlide === 'function'
        ? domApi.getStudioActiveSlide
        : null;
    if (!resolveActiveSlide) {
      return null;
    }
    return resolveActiveSlide(doc, options.domOptions || {});
  }

  function createStudioEditorActiveSlideResolver(options = {}) {
    const domApi = options.domApi && typeof options.domApi === 'object'
      ? options.domApi
      : null;
    const activeSlideResolver = typeof options.activeSlideResolver === 'function'
      ? options.activeSlideResolver
      : null;

    return (doc, domOptions = {}) => getStudioEditorActiveSlide(doc, {
      domApi,
      activeSlideResolver,
      domOptions
    });
  }

  return {
    getStudioEditorActiveSlide,
    createStudioEditorActiveSlideResolver
  };
});
