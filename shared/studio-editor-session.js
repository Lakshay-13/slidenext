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

  function createStudioSessionSnapshot(options = {}) {
    return {
      presentationUrl: normalizeString(options.presentationUrl),
      sessionToken: Number.isInteger(options.sessionToken) ? options.sessionToken : null
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

  return {
    createStudioSessionStateReaders,
    createStudioSessionSnapshot,
    createStudioPresentationSessionStateUpdate,
    isCurrentStudioEditorSession,
    shouldHandleStudioFrameLoad,
    createStudioFrameLoadHandler
  };
});
