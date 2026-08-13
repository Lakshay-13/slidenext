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
    const documentRef = options.documentRef || null;
    const getPresentationTitle = typeof options.getPresentationTitle === 'function'
      ? options.getPresentationTitle
      : () => '';
    const getPresentationCategory = typeof options.getPresentationCategory === 'function'
      ? options.getPresentationCategory
      : () => '';
    const setAutoSaveStatus = typeof options.setAutoSaveStatus === 'function'
      ? options.setAutoSaveStatus
      : () => {};
    const setFrameLoadingState = typeof options.setFrameLoadingState === 'function'
      ? options.setFrameLoadingState
      : () => {};
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

    function prepareLaunch() {
      const categoryLabel = documentRef && typeof documentRef.getElementById === 'function'
        ? documentRef.getElementById('studioCategoryLabel')
        : null;
      if (categoryLabel) categoryLabel.textContent = getPresentationCategory();
      const titleLabel = documentRef && typeof documentRef.getElementById === 'function'
        ? documentRef.getElementById('studioTitleLabel')
        : null;
      if (titleLabel) titleLabel.textContent = getPresentationTitle();

      setAutoSaveStatus('loading');
      setFrameLoadingState('loading');
      return reset({ isLoading: true });
    }

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

    return { prepareLaunch, reset };
  }

  return {
    createStudioEditorSessionUiController
  };
});
