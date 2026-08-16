(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorSessionBridgeController = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function createStudioEditorSessionBridgeController(options = {}) {
    const sessionStateController = options.sessionStateController || null;
    const sessionApi = options.sessionApi || null;
    const getPresentationUrl = typeof options.getPresentationUrl === 'function'
      ? options.getPresentationUrl
      : () => '';
    const getSessionToken = typeof options.getSessionToken === 'function'
      ? options.getSessionToken
      : () => 0;
    let snapshotAdapter = null;

    function createReaders() {
      if (sessionStateController
        && typeof sessionStateController.readers === 'function') {
        return sessionStateController.readers();
      }
      return {
        getCurrentPresentationUrl: () => '',
        getCurrentSessionToken: () => 0
      };
    }

    function createReaderOptions(options = {}) {
      if (sessionStateController
        && typeof sessionStateController.readerOptions === 'function') {
        return sessionStateController.readerOptions(options);
      }
      return {
        ...createReaders(),
        ...options
      };
    }

    function capture() {
      if (sessionStateController
        && typeof sessionStateController.capture === 'function') {
        return sessionStateController.capture();
      }

      const createSnapshotAdapter = sessionApi
        && typeof sessionApi.createStudioEditorSessionSnapshotAdapter === 'function'
        ? sessionApi.createStudioEditorSessionSnapshotAdapter
        : null;
      if (createSnapshotAdapter) {
        if (typeof snapshotAdapter !== 'function') {
          snapshotAdapter = createSnapshotAdapter({
            sessionApi,
            getPresentationUrl,
            getSessionToken
          });
        }
        const snapshot = typeof snapshotAdapter === 'function'
          ? snapshotAdapter()
          : null;
        if (snapshot !== null && typeof snapshot !== 'undefined') {
          return snapshot;
        }
      }

      const createSessionSnapshot = sessionApi
        && typeof sessionApi.createStudioSessionSnapshot === 'function'
        ? sessionApi.createStudioSessionSnapshot
        : null;
      if (createSessionSnapshot) {
        return createSessionSnapshot({
          presentationUrl: getPresentationUrl(),
          sessionToken: getSessionToken()
        });
      }

      return {
        presentationUrl: getPresentationUrl(),
        sessionToken: getSessionToken()
      };
    }

    function update(nextState = {}) {
      if (sessionStateController
        && typeof sessionStateController.update === 'function') {
        return sessionStateController.update(nextState);
      }
      return false;
    }

    function createFrameLoadHandler(options = {}) {
      if (sessionStateController
        && typeof sessionStateController.createFrameLoadHandler === 'function') {
        return sessionStateController.createFrameLoadHandler(options);
      }
      return () => false;
    }

    function shouldHandleFrameLoad(expectedPresentationUrl = '', options = {}) {
      if (sessionStateController
        && typeof sessionStateController.shouldHandleFrameLoad === 'function') {
        return sessionStateController.shouldHandleFrameLoad(expectedPresentationUrl, options);
      }
      return false;
    }

    return {
      createReaders,
      createReaderOptions,
      capture,
      update,
      createFrameLoadHandler,
      shouldHandleFrameLoad
    };
  }

  return {
    createStudioEditorSessionBridgeController
  };
});
