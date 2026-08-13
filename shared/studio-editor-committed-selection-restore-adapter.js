(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorCommittedSelectionRestoreAdapter = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function restoreStudioEditorCommittedSelectionByIdsOnActiveSlide(selectedIds, doc, options = {}) {
    const selectionApi = options.selectionApi && typeof options.selectionApi === 'object'
      ? options.selectionApi
      : null;
    const restoreSelection = selectionApi
      && typeof selectionApi.restoreCommittedStudioSelectionByIdsOnActiveSlide === 'function'
      ? selectionApi.restoreCommittedStudioSelectionByIdsOnActiveSlide
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
      hideDragHudOnClear: !!options.hideDragHudOnClear,
      syncInspectorForSelection: options.syncInspectorForSelection,
      updateLayersList: options.updateLayersList
    });
  }

  return {
    restoreStudioEditorCommittedSelectionByIdsOnActiveSlide
  };
});
