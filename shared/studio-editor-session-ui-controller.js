(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorSessionUiController = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function createStudioEditorSessionUiController(options = {}) {
    const resetPresentationUiState = typeof options.resetPresentationUiState === 'function'
      ? options.resetPresentationUiState
      : () => {};
    const resetSourceViewUiState = typeof options.resetSourceViewUiState === 'function'
      ? options.resetSourceViewUiState
      : () => {};
    const resetDeckUiState = typeof options.resetDeckUiState === 'function'
      ? options.resetDeckUiState
      : () => {};
    const resetVersionUiState = typeof options.resetVersionUiState === 'function'
      ? options.resetVersionUiState
      : () => {};
    const resetSaveButtonState = typeof options.resetSaveButtonState === 'function'
      ? options.resetSaveButtonState
      : () => {};
    const updateDeckReadyToolbarActionState = typeof options.updateDeckReadyToolbarActionState === 'function'
      ? options.updateDeckReadyToolbarActionState
      : () => {};

    function reset(resetOptions = {}) {
      const isLoading = !!resetOptions.isLoading;
      resetPresentationUiState();
      resetSourceViewUiState();
      if (resetOptions.resetDeckUiState !== false) {
        resetDeckUiState({ isLoading });
      }
      resetVersionUiState({ isLoading });
      resetSaveButtonState();
      updateDeckReadyToolbarActionState();
      return true;
    }

    return { reset };
  }

  return {
    createStudioEditorSessionUiController
  };
});
