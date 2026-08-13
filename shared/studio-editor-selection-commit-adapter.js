(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorSelectionCommitAdapter = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function commitStudioEditorSelectionState(nextSelectionState, options = {}) {
    const selectionApi = options.selectionApi && typeof options.selectionApi === 'object'
      ? options.selectionApi
      : null;
    const commitSelectionState = selectionApi
      && typeof selectionApi.commitStudioSelectionState === 'function'
      ? selectionApi.commitStudioSelectionState
      : null;
    if (!commitSelectionState) {
      return false;
    }

    const getSelectionOptions = typeof options.getSelectionOptions === 'function'
      ? options.getSelectionOptions
      : () => ({});
    const commitOptions = options.commitOptions && typeof options.commitOptions === 'object'
      ? options.commitOptions
      : {};
    return commitSelectionState(nextSelectionState, {
      ...getSelectionOptions(),
      applySelectionState: options.applySelectionState,
      refreshSelectionClasses: options.refreshSelectionClasses,
      syncSelectionOverlay: options.syncSelectionOverlay,
      syncInspectorForSelection: options.syncInspectorForSelection,
      updateLayersList: options.updateLayersList,
      ...commitOptions
    });
  }

  return {
    commitStudioEditorSelectionState
  };
});
