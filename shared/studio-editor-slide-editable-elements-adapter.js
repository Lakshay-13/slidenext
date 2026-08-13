(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorSlideEditableElementsAdapter = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function resolveDomApi(options = {}) {
    return options.domApi && typeof options.domApi === 'object'
      ? options.domApi
      : null;
  }

  function getStudioEditorSlideEditableElements(slide, options = {}) {
    const domApi = resolveDomApi(options);
    const readSlideEditableElements = typeof options.slideEditableElementsReader === 'function'
      ? options.slideEditableElementsReader
      : domApi
        && typeof domApi.getStudioSlideEditableElements === 'function'
        ? domApi.getStudioSlideEditableElements
        : null;
    if (!readSlideEditableElements) {
      return [];
    }
    return readSlideEditableElements(slide, options.domOptions || {});
  }

  return { getStudioEditorSlideEditableElements };
});
