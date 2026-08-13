(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorSlideIdAdapter = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function resolveDomApi(options = {}) {
    return options.domApi && typeof options.domApi === 'object'
      ? options.domApi
      : null;
  }

  function assignStudioEditorSlideId(slide, options = {}) {
    const domApi = resolveDomApi(options);
    const assignSlideId = typeof options.slideIdAssigner === 'function'
      ? options.slideIdAssigner
      : domApi
        && typeof domApi.assignStudioSlideId === 'function'
        ? domApi.assignStudioSlideId
        : null;
    if (!assignSlideId) {
      return '';
    }
    return assignSlideId(slide, options.domOptions || {});
  }

  function getStudioEditorSlideId(slide, options = {}) {
    const domApi = resolveDomApi(options);
    const readSlideId = typeof options.slideIdReader === 'function'
      ? options.slideIdReader
      : domApi
        && typeof domApi.getStudioSlideId === 'function'
        ? domApi.getStudioSlideId
        : null;
    if (!readSlideId) {
      return '';
    }
    return readSlideId(slide, options.domOptions || {});
  }

  return {
    assignStudioEditorSlideId,
    getStudioEditorSlideId
  };
});
