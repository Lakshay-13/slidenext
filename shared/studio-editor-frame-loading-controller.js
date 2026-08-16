(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorFrameLoadingController = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function createStudioEditorFrameLoadingController(options = {}) {
    const documentRef = options.documentRef || null;
    const loadingViewApi = options.loadingViewApi || null;
    const setAutoSaveStatus = typeof options.setAutoSaveStatus === 'function'
      ? options.setAutoSaveStatus
      : null;
    const getPresentationUrl = typeof options.getPresentationUrl === 'function'
      ? options.getPresentationUrl
      : () => '';
    const getPresentationTitle = typeof options.getPresentationTitle === 'function'
      ? options.getPresentationTitle
      : () => '';
    const getPresentationCategory = typeof options.getPresentationCategory === 'function'
      ? options.getPresentationCategory
      : () => 'General';
    const launchStudioEditor = typeof options.launchStudioEditor === 'function'
      ? options.launchStudioEditor
      : null;

    function setLoadingState(state = 'loading') {
      if (!loadingViewApi
        || typeof loadingViewApi.setStudioEditorFrameLoadingState !== 'function') {
        return false;
      }
      return loadingViewApi.setStudioEditorFrameLoadingState({
        documentRef,
        state
      });
    }

    function reportInitializationError() {
      setLoadingState('error');
      if (setAutoSaveStatus) {
        setAutoSaveStatus('editor-load-failed');
      }
      return false;
    }

    async function retry() {
      const presentationUrl = getPresentationUrl();
      if (!presentationUrl || !launchStudioEditor) return false;
      return launchStudioEditor(
        presentationUrl,
        getPresentationTitle(),
        getPresentationCategory() || 'General'
      );
    }

    function bind() {
      if (!loadingViewApi
        || typeof loadingViewApi.bindStudioEditorFrameLoadingControls !== 'function') {
        return {};
      }
      return loadingViewApi.bindStudioEditorFrameLoadingControls({
        documentRef,
        retryStudioEditorFrame: retry
      });
    }

    return {
      setLoadingState,
      reportInitializationError,
      retry,
      bind
    };
  }

  return {
    createStudioEditorFrameLoadingController
  };
});
