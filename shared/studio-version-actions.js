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

  function createStudioVersionActionHandlerOptionsBuilder(options = {}) {
    const defaultCreateSessionReaderOptions = typeof options.createSessionReaderOptions === 'function'
      ? options.createSessionReaderOptions
      : (nextOptions = {}) => nextOptions;

    return function createVersionActionHandlerOptions(nextOptions = {}) {
      const createSessionReaderOptions = typeof nextOptions.createSessionReaderOptions === 'function'
        ? nextOptions.createSessionReaderOptions
        : defaultCreateSessionReaderOptions;

      return createSessionReaderOptions(nextOptions);
    };
  }

  function createStudioVersionRequestOptionsBuilder(options = {}) {
    const defaultFetchImpl = typeof options.fetchImpl === 'function'
      ? options.fetchImpl
      : null;

    return function createVersionRequestOptions(nextOptions = {}) {
      return {
        fetchImpl: defaultFetchImpl,
        ...nextOptions
      };
    };
  }

  function createStudioVersionActionFailureHandler(options = {}) {
    const createHandlerOptions = typeof options.createHandlerOptions === 'function'
      ? options.createHandlerOptions
      : (nextOptions = {}) => nextOptions;
    const defaultHandleVersionActionFailure = typeof options.handleVersionActionFailure === 'function'
      ? options.handleVersionActionFailure
      : handleStudioVersionActionFailure;

    return function handleVersionActionFailure(context = {}, nextOptions = {}) {
      const handleVersionActionFailure = typeof nextOptions.handleVersionActionFailure === 'function'
        ? nextOptions.handleVersionActionFailure
        : defaultHandleVersionActionFailure;
      const resolveHandlerOptions = typeof nextOptions.createHandlerOptions === 'function'
        ? nextOptions.createHandlerOptions
        : createHandlerOptions;

      return handleVersionActionFailure(context, resolveHandlerOptions(nextOptions));
    };
  }

  function createStudioVersionListMutationSuccessHandler(options = {}) {
    const createHandlerOptions = typeof options.createHandlerOptions === 'function'
      ? options.createHandlerOptions
      : (nextOptions = {}) => nextOptions;
    const defaultHandleVersionListMutationSuccess = typeof options.handleVersionListMutationSuccess === 'function'
      ? options.handleVersionListMutationSuccess
      : handleStudioVersionListMutationSuccess;

    return function handleVersionListMutationSuccess(context = {}, nextOptions = {}) {
      const handleVersionListMutationSuccess = typeof nextOptions.handleVersionListMutationSuccess === 'function'
        ? nextOptions.handleVersionListMutationSuccess
        : defaultHandleVersionListMutationSuccess;
      const resolveHandlerOptions = typeof nextOptions.createHandlerOptions === 'function'
        ? nextOptions.createHandlerOptions
        : createHandlerOptions;

      return handleVersionListMutationSuccess(context, resolveHandlerOptions(nextOptions));
    };
  }

  function createStudioRestoreVersionSuccessHandler(options = {}) {
    const createHandlerOptions = typeof options.createHandlerOptions === 'function'
      ? options.createHandlerOptions
      : (nextOptions = {}) => nextOptions;
    const defaultHandleRestoreVersionSuccess = typeof options.handleRestoreVersionSuccess === 'function'
      ? options.handleRestoreVersionSuccess
      : handleStudioRestoreVersionSuccess;

    return function handleRestoreVersionSuccess(context = {}, nextOptions = {}) {
      const handleRestoreVersionSuccess = typeof nextOptions.handleRestoreVersionSuccess === 'function'
        ? nextOptions.handleRestoreVersionSuccess
        : defaultHandleRestoreVersionSuccess;
      const resolveHandlerOptions = typeof nextOptions.createHandlerOptions === 'function'
        ? nextOptions.createHandlerOptions
        : createHandlerOptions;

      return handleRestoreVersionSuccess(context, resolveHandlerOptions(nextOptions));
    };
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

  async function executeStudioVersionActionRequest(request = {}, options = {}) {
    const fetchImpl = typeof options.fetchImpl === 'function'
      ? options.fetchImpl
      : root && typeof root.fetch === 'function'
        ? root.fetch.bind(root)
        : null;
    if (!fetchImpl) {
      throw new TypeError(
        normalizeString(
          options.missingFetchErrorMessage,
          'A fetch implementation is required to execute studio version requests.'
        )
      );
    }

    const response = await fetchImpl(normalizeString(request.url), request.init || {});
    return response.json();
  }

  function createStudioRestoreVersionRequest(versionFilename = '', context = {}) {
    return {
      url: '/api/restore',
      init: {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          htmlPath: normalizeString(context.presentationUrl),
          versionFilename: normalizeString(versionFilename)
        })
      }
    };
  }

  async function executeStudioRestoreVersionRequest(versionFilename = '', context = {}, options = {}) {
    const request = createStudioRestoreVersionRequest(versionFilename, context);
    return executeStudioVersionActionRequest(request, {
      fetchImpl: options.fetchImpl,
      missingFetchErrorMessage: 'A fetch implementation is required to execute studio restore version requests.'
    });
  }

  function createStudioRenameVersionRequest(versionFilename = '', newLabel = '', context = {}) {
    return {
      url: '/api/versions/rename',
      init: {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          htmlPath: normalizeString(context.presentationUrl),
          versionFilename: normalizeString(versionFilename),
          newLabel: normalizeString(newLabel)
        })
      }
    };
  }

  async function executeStudioRenameVersionRequest(versionFilename = '', newLabel = '', context = {}, options = {}) {
    const request = createStudioRenameVersionRequest(versionFilename, newLabel, context);
    return executeStudioVersionActionRequest(request, {
      fetchImpl: options.fetchImpl,
      missingFetchErrorMessage: 'A fetch implementation is required to execute studio rename version requests.'
    });
  }

  function createStudioDeleteVersionRequest(versionFilename = '', context = {}) {
    return {
      url: '/api/versions/delete',
      init: {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          htmlPath: normalizeString(context.presentationUrl),
          versionFilename: normalizeString(versionFilename)
        })
      }
    };
  }

  async function executeStudioDeleteVersionRequest(versionFilename = '', context = {}, options = {}) {
    const request = createStudioDeleteVersionRequest(versionFilename, context);
    return executeStudioVersionActionRequest(request, {
      fetchImpl: options.fetchImpl,
      missingFetchErrorMessage: 'A fetch implementation is required to execute studio delete version requests.'
    });
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
    createStudioVersionActionHandlerOptionsBuilder,
    createStudioVersionRequestOptionsBuilder,
    createStudioVersionActionFailureHandler,
    createStudioVersionListMutationSuccessHandler,
    createStudioRestoreVersionSuccessHandler,
    isStudioVersionActionCurrent,
    isStudioVersionActionSessionCurrent,
    shouldDebounceStudioAutoVersion,
    executeStudioVersionActionRequest,
    createStudioRestoreVersionRequest,
    executeStudioRestoreVersionRequest,
    createStudioRenameVersionRequest,
    executeStudioRenameVersionRequest,
    createStudioDeleteVersionRequest,
    executeStudioDeleteVersionRequest,
    handleStudioRestoreVersionSuccess,
    handleStudioVersionListMutationSuccess,
    handleStudioVersionActionFailure
  };
});
