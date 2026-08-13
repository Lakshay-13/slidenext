(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorCommittedSelectionIdsAdapter = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function getStudioEditorCommittedSelectedElementIds(elements, doc, options = {}) {
    const selectionApi = options.selectionApi && typeof options.selectionApi === 'object'
      ? options.selectionApi
      : null;
    const readSelectionIds = selectionApi
      && typeof selectionApi.getStudioCommittedSelectedElementIds === 'function'
      ? selectionApi.getStudioCommittedSelectedElementIds
      : null;
    if (!readSelectionIds) {
      return null;
    }

    const selectionOptions = typeof options.getSelectionOptions === 'function'
      ? options.getSelectionOptions()
      : options.selectionOptions;
    return readSelectionIds(elements, doc, selectionOptions);
  }

  return {
    getStudioEditorCommittedSelectedElementIds
  };
});
