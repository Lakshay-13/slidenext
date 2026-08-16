(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorSessionAccessors = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function createStudioEditorSessionAccessors(options = {}) {
    const bridge = options.sessionBridgeController || null;
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
      if (bridge && typeof bridge.createReaders === 'function') {
        return bridge.createReaders();
      }
      if (sessionStateController && typeof sessionStateController.readers === 'function') {
        return sessionStateController.readers();
      }
      return {
        getCurrentPresentationUrl: () => '',
        getCurrentSessionToken: () => 0
      };
    }

    function createReaderOptions(nextOptions = {}) {
      if (bridge && typeof bridge.createReaderOptions === 'function') {
        return bridge.createReaderOptions(nextOptions);
      }
      if (sessionStateController && typeof sessionStateController.readerOptions === 'function') {
        return sessionStateController.readerOptions(nextOptions);
      }
      return {
        ...createReaders(),
        ...nextOptions
      };
    }

    function capture() {
      if (bridge && typeof bridge.capture === 'function') {
        return bridge.capture();
      }
      if (sessionStateController && typeof sessionStateController.capture === 'function') {
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
      if (bridge && typeof bridge.update === 'function') {
        return bridge.update(nextState);
      }
      if (sessionStateController && typeof sessionStateController.update === 'function') {
        return sessionStateController.update(nextState);
      }
      return false;
    }

    function createFrameLoadHandler(nextOptions = {}) {
      if (bridge && typeof bridge.createFrameLoadHandler === 'function') {
        return bridge.createFrameLoadHandler(nextOptions);
      }
      if (sessionStateController && typeof sessionStateController.createFrameLoadHandler === 'function') {
        return sessionStateController.createFrameLoadHandler(nextOptions);
      }
      return () => false;
    }

    function shouldHandleFrameLoad(expectedPresentationUrl = '', nextOptions = {}) {
      if (bridge && typeof bridge.shouldHandleFrameLoad === 'function') {
        return bridge.shouldHandleFrameLoad(expectedPresentationUrl, nextOptions);
      }
      if (sessionStateController && typeof sessionStateController.shouldHandleFrameLoad === 'function') {
        return sessionStateController.shouldHandleFrameLoad(expectedPresentationUrl, nextOptions);
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
    createStudioEditorSessionAccessors
  };
});
