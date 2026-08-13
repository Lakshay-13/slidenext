(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorSelectionIdsAdapter = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function getStudioEditorSelectedElementIds(elements, options = {}) {
    const selectionApi = options.selectionApi && typeof options.selectionApi === 'object'
      ? options.selectionApi
      : null;
    const readSelectionIds = selectionApi
      && typeof selectionApi.getStudioSelectedElementIds === 'function'
      ? selectionApi.getStudioSelectedElementIds
      : null;
    if (!readSelectionIds) {
      return null;
    }

    const selectionOptions = typeof options.getSelectionOptions === 'function'
      ? options.getSelectionOptions()
      : options.selectionOptions;
    return readSelectionIds(elements, selectionOptions);
  }

  return {
    getStudioEditorSelectedElementIds
  };
});
