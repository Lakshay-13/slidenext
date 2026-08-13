(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorPreservedSelectionRestoreAdapter = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function restoreStudioEditorPreservedSelectionAfterSlideMutation(selectedIds, doc, options = {}) {
    const selectionApi = options.selectionApi && typeof options.selectionApi === 'object'
      ? options.selectionApi
      : null;
    const restoreSelection = selectionApi
      && typeof selectionApi.restoreStudioSelectionAfterSlideMutation === 'function'
      ? selectionApi.restoreStudioSelectionAfterSlideMutation
      : null;
    if (!restoreSelection) {
      return null;
    }

    const selectionOptions = typeof options.getSelectionOptions === 'function'
      ? options.getSelectionOptions()
      : options.selectionOptions;
    return restoreSelection(selectedIds, doc, {
      ...selectionOptions,
      applySelectionState: options.applySelectionState,
      syncSelectionOverlay: options.syncSelectionOverlay,
      hideDragHud: options.hideDragHud,
      syncInspectorForSelection: options.syncInspectorForSelection,
      updateLayersList: options.updateLayersList,
      preserveSelection: options.preserveSelection
    });
  }

  return {
    restoreStudioEditorPreservedSelectionAfterSlideMutation
  };
});
