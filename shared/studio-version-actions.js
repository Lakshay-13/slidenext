(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioVersionActions = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const STUDIO_AUTO_VERSION_DEBOUNCE_MS = 10000;
  const STUDIO_AUTO_VERSION_TIMER_KEY = 'frequent_action';

  function normalizeString(value, fallback = '') {
    return typeof value === 'string' ? value : fallback;
  }

  function normalizeSessionToken(value) {
    return Number.isInteger(value) ? value : null;
  }

  function createStudioVersionActionContext(presentationUrl = '', presentationTitle = '', presentationCategory = '', options = {}) {
    const context = {
      presentationUrl: normalizeString(presentationUrl),
      presentationTitle: normalizeString(presentationTitle),
      presentationCategory: normalizeString(presentationCategory)
    };
    const sessionToken = normalizeSessionToken(options.sessionToken);
    if (sessionToken !== null) {
      context.sessionToken = sessionToken;
    }
    return context;
  }

  function isStudioVersionActionCurrent(context = {}, options = {}) {
    const requestedPresentationUrl = normalizeString(context.presentationUrl);
    if (!requestedPresentationUrl) {
      return false;
    }

    const getCurrentPresentationUrl = typeof options.getCurrentPresentationUrl === 'function'
      ? options.getCurrentPresentationUrl
      : () => options.currentPresentationUrl;

    if (normalizeString(getCurrentPresentationUrl()) !== requestedPresentationUrl) {
      return false;
    }

    const requestedSessionToken = normalizeSessionToken(context.sessionToken);
    if (requestedSessionToken === null) {
      return true;
    }

    const getCurrentSessionToken = typeof options.getCurrentSessionToken === 'function'
      ? options.getCurrentSessionToken
      : () => options.currentSessionToken;

    return normalizeSessionToken(getCurrentSessionToken()) === requestedSessionToken;
  }

  function isStudioVersionActionSessionCurrent(context = {}, options = {}) {
    if (!isStudioVersionActionCurrent(context, options)) {
      return false;
    }
    return typeof options.isCurrentSession === 'function'
      ? !!options.isCurrentSession()
      : true;
  }

  function shouldDebounceStudioAutoVersion(label = '') {
    const versionLabel = normalizeString(label);
    return versionLabel.includes('Moved')
      || versionLabel.includes('Edited')
      || versionLabel.includes('Changed')
      || versionLabel.includes('Rearranged');
  }

  function createStudioVersionActionHandlerOptions(options = {}) {
    return {
      getCurrentPresentationUrl: options.getCurrentPresentationUrl,
      getCurrentSessionToken: options.getCurrentSessionToken,
      isCurrentSession: options.isCurrentSession,
      onSuccess: options.onSuccess,
      onFailure: options.onFailure,
      hideVersionsDropdown: options.hideVersionsDropdown,
      relaunchEditor: options.relaunchEditor,
      refreshVersionEntries: options.refreshVersionEntries
    };
  }

  function handleStudioRestoreVersionSuccess(context = {}, options = {}) {
    if (!isStudioVersionActionSessionCurrent(context, options)) {
      return false;
    }

    if (typeof options.onSuccess === 'function') {
      options.onSuccess(context);
    }
    if (typeof options.hideVersionsDropdown === 'function') {
      options.hideVersionsDropdown();
    }
    if (typeof options.relaunchEditor === 'function') {
      options.relaunchEditor(
        context.presentationUrl,
        context.presentationTitle,
        context.presentationCategory
      );
    }

    return true;
  }

  function handleStudioVersionListMutationSuccess(context = {}, options = {}) {
    if (!isStudioVersionActionSessionCurrent(context, options)) {
      return false;
    }

    if (typeof options.onSuccess === 'function') {
      options.onSuccess(context);
    }
    if (typeof options.refreshVersionEntries === 'function') {
      options.refreshVersionEntries(context.presentationUrl, normalizeSessionToken(context.sessionToken));
    }

    return true;
  }

  function handleStudioVersionActionFailure(context = {}, options = {}) {
    if (!isStudioVersionActionSessionCurrent(context, options)) {
      return false;
    }

    if (typeof options.onFailure === 'function') {
      options.onFailure(context);
    }

    return true;
  }

  return {
    STUDIO_AUTO_VERSION_DEBOUNCE_MS,
    STUDIO_AUTO_VERSION_TIMER_KEY,
    createStudioVersionActionContext,
    isStudioVersionActionCurrent,
    isStudioVersionActionSessionCurrent,
    shouldDebounceStudioAutoVersion,
    createStudioVersionActionHandlerOptions,
    handleStudioRestoreVersionSuccess,
    handleStudioVersionListMutationSuccess,
    handleStudioVersionActionFailure
  };
});
