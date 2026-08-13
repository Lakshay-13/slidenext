(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorSelectionStateAdapter = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function applyStudioEditorSelectionState(nextState = {}, options = {}) {
    const selectionApi = options.selectionApi && typeof options.selectionApi === 'object'
      ? options.selectionApi
      : null;
    const normalizeSelectionState = selectionApi
      && typeof selectionApi.normalizeStudioSelectionState === 'function'
      ? selectionApi.normalizeStudioSelectionState
      : null;
    if (!normalizeSelectionState) {
      if (typeof options.clearSelectionState === 'function') {
        options.clearSelectionState();
      }
      return false;
    }

    const selectionOptions = typeof options.getSelectionOptions === 'function'
      ? options.getSelectionOptions()
      : options.selectionOptions;
    const normalizedState = normalizeSelectionState(nextState, selectionOptions);
    if (typeof options.setSelectionState === 'function') {
      options.setSelectionState(normalizedState);
    }
    return true;
  }

  return {
    applyStudioEditorSelectionState
  };
});
