(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorSelectionRestoreAdapter = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function restoreStudioEditorSelectionByIdsOnActiveSlide(selectedIds, doc, options = {}) {
    const selectionApi = options.selectionApi && typeof options.selectionApi === 'object'
      ? options.selectionApi
      : null;
    const restoreSelection = selectionApi
      && typeof selectionApi.restoreStudioSelectionByIdsOnActiveSlide === 'function'
      ? selectionApi.restoreStudioSelectionByIdsOnActiveSlide
      : null;
    if (!restoreSelection) {
      return null;
    }

    const selectionOptions = typeof options.getSelectionOptions === 'function'
      ? options.getSelectionOptions()
      : options.selectionOptions;
    return restoreSelection(selectedIds, doc, selectionOptions);
  }

  return {
    restoreStudioEditorSelectionByIdsOnActiveSlide
  };
});
