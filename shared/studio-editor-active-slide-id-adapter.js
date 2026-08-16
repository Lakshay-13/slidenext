(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorActiveSlideIdAdapter = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function getStudioEditorActiveSlideId(doc, options = {}) {
    const domApi = options.domApi && typeof options.domApi === 'object'
      ? options.domApi
      : null;
    const resolveActiveSlideId = typeof options.activeSlideIdResolver === 'function'
      ? options.activeSlideIdResolver
      : domApi
        && typeof domApi.getStudioActiveSlideId === 'function'
        ? domApi.getStudioActiveSlideId
        : null;
    if (!resolveActiveSlideId) {
      return '';
    }
    return resolveActiveSlideId(doc, options.domOptions || {});
  }

  function createStudioEditorActiveSlideIdResolver(options = {}) {
    const domApi = options.domApi && typeof options.domApi === 'object'
      ? options.domApi
      : null;
    const activeSlideIdResolver = typeof options.activeSlideIdResolver === 'function'
      ? options.activeSlideIdResolver
      : null;

    return (doc, domOptions = {}) => getStudioEditorActiveSlideId(doc, {
      domApi,
      activeSlideIdResolver,
      domOptions
    });
  }

  return {
    getStudioEditorActiveSlideId,
    createStudioEditorActiveSlideIdResolver
  };
});
