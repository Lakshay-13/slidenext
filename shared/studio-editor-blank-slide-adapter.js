(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorBlankSlideAdapter = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function resolveDomApi(options = {}) {
    return options.domApi && typeof options.domApi === 'object'
      ? options.domApi
      : null;
  }

  function createStudioEditorBlankSlide(doc, options = {}) {
    const domApi = resolveDomApi(options);
    const createBlankSlide = typeof options.blankSlideFactory === 'function'
      ? options.blankSlideFactory
      : domApi
        && typeof domApi.createStudioBlankSlide === 'function'
        ? domApi.createStudioBlankSlide
        : null;
    if (!createBlankSlide) {
      return null;
    }
    return createBlankSlide(doc, options.domOptions || {});
  }

  return { createStudioEditorBlankSlide };
});
