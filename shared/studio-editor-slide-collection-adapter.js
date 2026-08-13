(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorSlideCollectionAdapter = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function resolveDomApi(options = {}) {
    return options.domApi && typeof options.domApi === 'object'
      ? options.domApi
      : null;
  }

  function getStudioEditorSlides(doc, options = {}) {
    const domApi = resolveDomApi(options);
    const readSlides = typeof options.slidesReader === 'function'
      ? options.slidesReader
      : domApi
        && typeof domApi.getStudioSlides === 'function'
        ? domApi.getStudioSlides
        : null;
    if (!readSlides) {
      return [];
    }
    return readSlides(doc, options.domOptions || {});
  }

  function getStudioEditorSlideById(slideId, doc, options = {}) {
    const domApi = resolveDomApi(options);
    const readSlideById = typeof options.slideByIdReader === 'function'
      ? options.slideByIdReader
      : domApi
        && typeof domApi.getStudioSlideById === 'function'
        ? domApi.getStudioSlideById
        : null;
    if (!readSlideById) {
      return null;
    }
    return readSlideById(slideId, doc, options.domOptions || {});
  }

  function getStudioEditorSlideIndexById(slideId, doc, options = {}) {
    const domApi = resolveDomApi(options);
    const readSlideIndexById = typeof options.slideIndexByIdReader === 'function'
      ? options.slideIndexByIdReader
      : domApi
        && typeof domApi.getStudioSlideIndexById === 'function'
        ? domApi.getStudioSlideIndexById
        : null;
    if (!readSlideIndexById) {
      return -1;
    }
    return readSlideIndexById(slideId, doc, options.domOptions || {});
  }

  return {
    getStudioEditorSlides,
    getStudioEditorSlideById,
    getStudioEditorSlideIndexById
  };
});
