(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorSession = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function normalizeString(value, fallback = '') {
    return typeof value === 'string' ? value : fallback;
  }

  function createStudioSessionStateReaders(options = {}) {
    return {
      getCurrentPresentationUrl: typeof options.getCurrentPresentationUrl === 'function'
        ? options.getCurrentPresentationUrl
        : () => normalizeString(options.currentPresentationUrl),
      getCurrentSessionToken: typeof options.getCurrentSessionToken === 'function'
        ? options.getCurrentSessionToken
        : () => (Number.isInteger(options.currentSessionToken) ? options.currentSessionToken : null)
    };
  }

  function createStudioEditorSessionStateReadersAdapter(options = {}) {
    const sessionApi = options.sessionApi && typeof options.sessionApi === 'object'
      ? options.sessionApi
      : null;
    const createSessionStateReaders = typeof options.createSessionStateReaders === 'function'
      ? options.createSessionStateReaders
      : sessionApi
        && typeof sessionApi.createStudioSessionStateReaders === 'function'
        ? sessionApi.createStudioSessionStateReaders
        : createStudioSessionStateReaders;
    const getCurrentPresentationUrl = typeof options.getCurrentPresentationUrl === 'function'
      ? options.getCurrentPresentationUrl
      : () => normalizeString(options.currentPresentationUrl);
    const getCurrentSessionToken = typeof options.getCurrentSessionToken === 'function'
      ? options.getCurrentSessionToken
      : () => (Number.isInteger(options.currentSessionToken) ? options.currentSessionToken : null);

    return function createEditorSessionStateReaders(nextOptions = {}) {
      const resolvedOptions = nextOptions && typeof nextOptions === 'object'
        ? nextOptions
        : {};
      const currentCreateSessionStateReaders = typeof resolvedOptions.createSessionStateReaders === 'function'
        ? resolvedOptions.createSessionStateReaders
        : createSessionStateReaders;
      const currentGetPresentationUrl = typeof resolvedOptions.getCurrentPresentationUrl === 'function'
        ? resolvedOptions.getCurrentPresentationUrl
        : getCurrentPresentationUrl;
      const currentGetSessionToken = typeof resolvedOptions.getCurrentSessionToken === 'function'
        ? resolvedOptions.getCurrentSessionToken
        : getCurrentSessionToken;
      return currentCreateSessionStateReaders({
        getCurrentPresentationUrl: currentGetPresentationUrl,
        getCurrentSessionToken: currentGetSessionToken
      });
    };
  }

  function createStudioEditorSessionReaderOptionsAdapter(options = {}) {
    const sessionApi = options.sessionApi && typeof options.sessionApi === 'object'
      ? options.sessionApi
      : null;
    const createSessionReaderOptionsBuilder = typeof options.createSessionReaderOptionsBuilder === 'function'
      ? options.createSessionReaderOptionsBuilder
      : sessionApi
        && typeof sessionApi.createStudioSessionReaderOptionsBuilder === 'function'
        ? sessionApi.createStudioSessionReaderOptionsBuilder
        : createStudioSessionReaderOptionsBuilder;
    const readCurrentSessionState = typeof options.readCurrentSessionState === 'function'
      ? options.readCurrentSessionState
      : () => createStudioSessionStateReaders(options);

    return function createEditorSessionReaderOptions(nextOptions = {}) {
      const resolvedOptions = nextOptions && typeof nextOptions === 'object'
        ? nextOptions
        : {};
      const currentCreateSessionReaderOptionsBuilder = typeof resolvedOptions.createSessionReaderOptionsBuilder === 'function'
        ? resolvedOptions.createSessionReaderOptionsBuilder
        : createSessionReaderOptionsBuilder;
      const currentReadCurrentSessionState = typeof resolvedOptions.readCurrentSessionState === 'function'
        ? resolvedOptions.readCurrentSessionState
        : readCurrentSessionState;
      if (currentCreateSessionReaderOptionsBuilder) {
        const createSessionReaderOptions = currentCreateSessionReaderOptionsBuilder({
          readCurrentSessionState: currentReadCurrentSessionState
        });
        if (typeof createSessionReaderOptions === 'function') {
          return createSessionReaderOptions(resolvedOptions);
        }
      }

      return {
        ...currentReadCurrentSessionState(),
        ...resolvedOptions
      };
    };
  }

  function createStudioSessionReaderOptionsBuilder(options = {}) {
    const defaultReadCurrentSessionState = typeof options.readCurrentSessionState === 'function'
      ? options.readCurrentSessionState
      : () => createStudioSessionStateReaders(options);

    return function createSessionReaderOptions(nextOptions = {}) {
      const readCurrentSessionState = typeof nextOptions.readCurrentSessionState === 'function'
        ? nextOptions.readCurrentSessionState
        : defaultReadCurrentSessionState;

      return {
        ...readCurrentSessionState(),
        ...nextOptions
      };
    };
  }

  function createStudioSessionSnapshot(options = {}) {
    return {
      presentationUrl: normalizeString(options.presentationUrl),
      sessionToken: Number.isInteger(options.sessionToken) ? options.sessionToken : null
    };
  }

  function createStudioEditorSessionSnapshotAdapter(options = {}) {
    const sessionApi = options.sessionApi && typeof options.sessionApi === 'object'
      ? options.sessionApi
      : null;
    const getPresentationUrl = typeof options.getPresentationUrl === 'function'
      ? options.getPresentationUrl
      : () => normalizeString(options.presentationUrl);
    const getSessionToken = typeof options.getSessionToken === 'function'
      ? options.getSessionToken
      : () => (Number.isInteger(options.sessionToken) ? options.sessionToken : null);
    const createSessionSnapshot = typeof options.createSessionSnapshot === 'function'
      ? options.createSessionSnapshot
      : sessionApi
        && typeof sessionApi.createStudioSessionSnapshot === 'function'
        ? sessionApi.createStudioSessionSnapshot
        : null;

    return function captureEditorSessionSnapshot(nextOptions = {}) {
      const resolvedOptions = nextOptions && typeof nextOptions === 'object'
        ? nextOptions
        : {};
      const currentGetPresentationUrl = typeof resolvedOptions.getPresentationUrl === 'function'
        ? resolvedOptions.getPresentationUrl
        : getPresentationUrl;
      const currentGetSessionToken = typeof resolvedOptions.getSessionToken === 'function'
        ? resolvedOptions.getSessionToken
        : getSessionToken;
      const currentCreateSessionSnapshot = typeof resolvedOptions.createSessionSnapshot === 'function'
        ? resolvedOptions.createSessionSnapshot
        : createSessionSnapshot;
      if (currentCreateSessionSnapshot) {
        return currentCreateSessionSnapshot({
          presentationUrl: currentGetPresentationUrl(),
          sessionToken: currentGetSessionToken()
        });
      }
      return {
        presentationUrl: currentGetPresentationUrl(),
        sessionToken: currentGetSessionToken()
      };
    };
  }

  function createStudioPresentationSessionStateUpdate(nextState = {}) {
    const sessionStateUpdate = {};
    if (Object.prototype.hasOwnProperty.call(nextState, 'presentationUrl')) {
      sessionStateUpdate.presentationUrl = normalizeString(nextState.presentationUrl);
    }
    if (Object.prototype.hasOwnProperty.call(nextState, 'presentationTitle')) {
      sessionStateUpdate.presentationTitle = normalizeString(nextState.presentationTitle);
    }
    if (Object.prototype.hasOwnProperty.call(nextState, 'presentationCategory')) {
      sessionStateUpdate.presentationCategory = normalizeString(nextState.presentationCategory);
    }
    if (Object.prototype.hasOwnProperty.call(nextState, 'slideIndex')) {
      sessionStateUpdate.slideIndex = Number.isInteger(nextState.slideIndex) ? nextState.slideIndex : 0;
    }
    if (Object.prototype.hasOwnProperty.call(nextState, 'presentationMetadata')) {
      sessionStateUpdate.presentationMetadata = nextState.presentationMetadata;
    }
    return sessionStateUpdate;
  }

  function createStudioEditorPresentationSessionStateUpdateAdapter(options = {}) {
    const sessionApi = options.sessionApi && typeof options.sessionApi === 'object'
      ? options.sessionApi
      : null;
    const createSessionStateUpdate = typeof options.createSessionStateUpdate === 'function'
      ? options.createSessionStateUpdate
      : sessionApi
        && typeof sessionApi.createStudioPresentationSessionStateUpdate === 'function'
        ? sessionApi.createStudioPresentationSessionStateUpdate
        : createStudioPresentationSessionStateUpdate;

    return function normalizeEditorPresentationSessionState(nextState = {}, nextOptions = {}) {
      const resolvedOptions = nextOptions && typeof nextOptions === 'object'
        ? nextOptions
        : {};
      const currentCreateSessionStateUpdate = typeof resolvedOptions.createSessionStateUpdate === 'function'
        ? resolvedOptions.createSessionStateUpdate
        : createSessionStateUpdate;
      return currentCreateSessionStateUpdate(nextState);
    };
  }

  function createStudioEditorPresentationSessionStateController(options = {}) {
    const sessionApi = options.sessionApi && typeof options.sessionApi === 'object'
      ? options.sessionApi
      : null;
    const createStateUpdate = sessionApi
      && typeof sessionApi.createStudioEditorPresentationSessionStateUpdateAdapter === 'function'
      ? sessionApi.createStudioEditorPresentationSessionStateUpdateAdapter
      : createStudioEditorPresentationSessionStateUpdateAdapter;
    const normalizeState = createStateUpdate({ sessionApi });
    const getPresentationUrl = typeof options.getPresentationUrl === 'function'
      ? options.getPresentationUrl
      : () => normalizeString(options.presentationUrl);
    const getSessionToken = typeof options.getSessionToken === 'function'
      ? options.getSessionToken
      : () => (Number.isInteger(options.sessionToken) ? options.sessionToken : null);
    const createSnapshot = sessionApi
      && typeof sessionApi.createStudioEditorSessionSnapshotAdapter === 'function'
      ? sessionApi.createStudioEditorSessionSnapshotAdapter
      : createStudioEditorSessionSnapshotAdapter;
    const captureSnapshot = createSnapshot({
      sessionApi,
      getPresentationUrl,
      getSessionToken
    });
    const setPresentationUrl = typeof options.setPresentationUrl === 'function'
      ? options.setPresentationUrl
      : () => {};
    const setPresentationTitle = typeof options.setPresentationTitle === 'function'
      ? options.setPresentationTitle
      : () => {};
    const setPresentationCategory = typeof options.setPresentationCategory === 'function'
      ? options.setPresentationCategory
      : () => {};
    const setSlideIndex = typeof options.setSlideIndex === 'function'
      ? options.setSlideIndex
      : () => {};
    const setPresentationMetadata = typeof options.setPresentationMetadata === 'function'
      ? options.setPresentationMetadata
      : () => {};

    function update(nextState = {}) {
      const sessionStateUpdate = normalizeState(nextState);
      if (Object.prototype.hasOwnProperty.call(sessionStateUpdate, 'presentationUrl')) {
        setPresentationUrl(sessionStateUpdate.presentationUrl);
      }
      if (Object.prototype.hasOwnProperty.call(sessionStateUpdate, 'presentationTitle')) {
        setPresentationTitle(sessionStateUpdate.presentationTitle);
      }
      if (Object.prototype.hasOwnProperty.call(sessionStateUpdate, 'presentationCategory')) {
        setPresentationCategory(sessionStateUpdate.presentationCategory);
      }
      if (Object.prototype.hasOwnProperty.call(sessionStateUpdate, 'slideIndex')) {
        setSlideIndex(sessionStateUpdate.slideIndex);
      }
      if (Object.prototype.hasOwnProperty.call(sessionStateUpdate, 'presentationMetadata')) {
        setPresentationMetadata(sessionStateUpdate.presentationMetadata);
      }
      return sessionStateUpdate;
    }

    function capture() {
      return typeof captureSnapshot === 'function'
        ? captureSnapshot()
        : {
            presentationUrl: getPresentationUrl(),
            sessionToken: getSessionToken()
          };
    }

    return { update, capture };
  }

  function isCurrentStudioEditorSession(options = {}) {
    const expectedSessionToken = Number.isInteger(options.sessionToken)
      ? options.sessionToken
      : null;
    if (expectedSessionToken === null) {
      return true;
    }

    const getCurrentSessionToken = typeof options.getCurrentSessionToken === 'function'
      ? options.getCurrentSessionToken
      : () => options.currentSessionToken;

    return getCurrentSessionToken() === expectedSessionToken;
  }

  function shouldHandleStudioFrameLoad(expectedPresentationUrl = '', options = {}) {
    const presentationUrl = normalizeString(expectedPresentationUrl);
    if (!presentationUrl) {
      return false;
    }

    const getCurrentPresentationUrl = typeof options.getCurrentPresentationUrl === 'function'
      ? options.getCurrentPresentationUrl
      : () => options.currentPresentationUrl;
    const isEditorActive = typeof options.isEditorActive === 'function'
      ? options.isEditorActive
      : () => !!options.editorActive;

    return !!isEditorActive()
      && normalizeString(getCurrentPresentationUrl()) === presentationUrl
      && isCurrentStudioEditorSession(options);
  }

  function createStudioEditorFrameLoadGuardAdapter(options = {}) {
    const sessionApi = options.sessionApi && typeof options.sessionApi === 'object'
      ? options.sessionApi
      : null;
    const shouldHandleFrameLoad = typeof options.shouldHandleFrameLoad === 'function'
      ? options.shouldHandleFrameLoad
      : sessionApi
        && typeof sessionApi.shouldHandleStudioFrameLoad === 'function'
        ? sessionApi.shouldHandleStudioFrameLoad
        : shouldHandleStudioFrameLoad;

    return function shouldHandleEditorFrameLoad(expectedPresentationUrl = '', nextOptions = {}) {
      const resolvedOptions = nextOptions && typeof nextOptions === 'object'
        ? nextOptions
        : {};
      return shouldHandleFrameLoad(expectedPresentationUrl, resolvedOptions);
    };
  }

  function createStudioFrameLoadHandler(options = {}) {
    return () => {
      const shouldHandleLoad = typeof options.shouldHandleLoad === 'function'
        ? options.shouldHandleLoad(options.presentationUrl)
        : shouldHandleStudioFrameLoad(options.presentationUrl, options);
      if (!shouldHandleLoad) {
        return false;
      }

      if (typeof options.handleLoad === 'function') {
        options.handleLoad();
      }
      if (typeof options.afterLoad === 'function') {
        options.afterLoad();
      }

      return true;
    };
  }

  function createStudioEditorFrameLoadHandlerAdapter(options = {}) {
    const sessionApi = options.sessionApi && typeof options.sessionApi === 'object'
      ? options.sessionApi
      : null;
    const createFrameLoadHandler = typeof options.createFrameLoadHandler === 'function'
      ? options.createFrameLoadHandler
      : sessionApi
        && typeof sessionApi.createStudioFrameLoadHandler === 'function'
        ? sessionApi.createStudioFrameLoadHandler
        : createStudioFrameLoadHandler;

    return function createEditorFrameLoadHandler(nextOptions = {}) {
      const resolvedOptions = nextOptions && typeof nextOptions === 'object'
        ? nextOptions
        : {};
      return createFrameLoadHandler(resolvedOptions);
    };
  }

  return {
    createStudioSessionStateReaders,
    createStudioEditorSessionStateReadersAdapter,
    createStudioSessionReaderOptionsBuilder,
    createStudioEditorSessionReaderOptionsAdapter,
    createStudioSessionSnapshot,
    createStudioEditorSessionSnapshotAdapter,
    createStudioPresentationSessionStateUpdate,
    createStudioEditorPresentationSessionStateUpdateAdapter,
    createStudioEditorPresentationSessionStateController,
    isCurrentStudioEditorSession,
    shouldHandleStudioFrameLoad,
    createStudioEditorFrameLoadGuardAdapter,
    createStudioFrameLoadHandler,
    createStudioEditorFrameLoadHandlerAdapter
  };
});
