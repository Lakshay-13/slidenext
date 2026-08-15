(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorFrameInitializer = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function createStudioEditorFrameInitializer(options = {}) {
    const getFrameController = typeof options.getFrameController === 'function'
      ? options.getFrameController
      : () => options.frameController || null;
    const syncCanvasDimensions = typeof options.syncCanvasDimensions === 'function'
      ? options.syncCanvasDimensions
      : null;
    const setLoadingState = typeof options.setLoadingState === 'function'
      ? options.setLoadingState
      : null;
    const setAutoSaveStatus = typeof options.setAutoSaveStatus === 'function'
      ? options.setAutoSaveStatus
      : null;

    function reportInitializationError() {
      if (setLoadingState) {
        setLoadingState('error');
      }
      if (setAutoSaveStatus) {
        setAutoSaveStatus('editor-load-failed');
      }
      return false;
    }

    function initialize() {
      const frameController = getFrameController();
      if (!frameController || typeof frameController.init !== 'function') {
        return reportInitializationError();
      }

      let didInitialize = false;
      try {
        didInitialize = frameController.init();
      } catch (error) {
        didInitialize = false;
      }
      if (didInitialize && setLoadingState) {
        if (syncCanvasDimensions) {
          syncCanvasDimensions();
        }
        setLoadingState('ready');
      } else if (!didInitialize) {
        reportInitializationError();
      }
      return didInitialize;
    }

    return {
      initialize,
      reportInitializationError
    };
  }

  return {
    createStudioEditorFrameInitializer
  };
});
