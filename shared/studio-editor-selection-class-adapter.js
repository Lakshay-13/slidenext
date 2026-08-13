(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorSelectionClassAdapter = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function refreshStudioEditorSelectionClasses(doc, selectedElements = [], options = {}) {
    const selectionApi = options.selectionApi && typeof options.selectionApi === 'object'
      ? options.selectionApi
      : null;
    const refreshSelectionClasses = selectionApi
      && typeof selectionApi.refreshStudioSelectionClasses === 'function'
      ? selectionApi.refreshStudioSelectionClasses
      : null;
    if (!refreshSelectionClasses) {
      return null;
    }

    const selectionOptions = typeof options.getSelectionOptions === 'function'
      ? options.getSelectionOptions()
      : options.selectionOptions;
    return refreshSelectionClasses(doc, selectedElements, selectionOptions);
  }

  return {
    refreshStudioEditorSelectionClasses
  };
});
