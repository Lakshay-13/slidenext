(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioVersionHistory = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function normalizeString(value, fallback = '') {
    return typeof value === 'string' ? value : fallback;
  }

  function normalizeSessionToken(value) {
    return Number.isInteger(value) ? value : null;
  }

  function deriveStudioVersionDeckBaseName(presentationUrl = '') {
    const url = normalizeString(presentationUrl);
    if (!url) {
      return '';
    }

    const urlParts = url.split('/');
    const lastPart = urlParts[urlParts.length - 1] || '';
    const extensionIndex = lastPart.lastIndexOf('.');
    return extensionIndex === -1 ? lastPart : lastPart.substring(0, extensionIndex);
  }

  function createStudioVersionHistoryLoadOptionsBuilder(options = {}) {
    const defaultCreateSessionReaderOptions = typeof options.createSessionReaderOptions === 'function'
      ? options.createSessionReaderOptions
      : (nextOptions = {}) => nextOptions;
    const defaultRenderVersionEntries = typeof options.renderVersionEntries === 'function'
      ? options.renderVersionEntries
      : () => {};

    return function createVersionHistoryLoadOptions(
      presentationUrl = '',
      sessionToken = null,
      nextOptions = {}
    ) {
      const createSessionReaderOptions = typeof nextOptions.createSessionReaderOptions === 'function'
        ? nextOptions.createSessionReaderOptions
        : defaultCreateSessionReaderOptions;
      const renderVersionEntries = typeof nextOptions.renderVersionEntries === 'function'
        ? nextOptions.renderVersionEntries
        : defaultRenderVersionEntries;

      return createSessionReaderOptions({
        sessionToken: normalizeSessionToken(sessionToken),
        commitVersionEntries(versions) {
          renderVersionEntries(normalizeString(presentationUrl), versions);
        }
      });
    };
  }

  function createStudioVersionHistoryLoader(options = {}) {
    const getPresentationUrl = typeof options.getPresentationUrl === 'function'
      ? options.getPresentationUrl
      : () => normalizeString(options.presentationUrl);
    const getSessionToken = typeof options.getSessionToken === 'function'
      ? options.getSessionToken
      : () => normalizeSessionToken(options.sessionToken);
    const defaultCreateLoadOptions = typeof options.createLoadOptions === 'function'
      ? options.createLoadOptions
      : () => ({});
    const defaultLoadVersionHistory = typeof options.loadVersionHistory === 'function'
      ? options.loadVersionHistory
      : loadStudioVersionHistory;
    const defaultReportLoadError = typeof options.reportLoadError === 'function'
      ? options.reportLoadError
      : () => {};

    return async function loadVersionHistory(
      presentationUrl = getPresentationUrl(),
      sessionToken = getSessionToken(),
      nextOptions = {}
    ) {
      const requestedPresentationUrl = normalizeString(presentationUrl);
      if (!requestedPresentationUrl) {
        return undefined;
      }

      const requestedSessionToken = normalizeSessionToken(sessionToken);
      const createLoadOptions = typeof nextOptions.createLoadOptions === 'function'
        ? nextOptions.createLoadOptions
        : defaultCreateLoadOptions;
      const loadVersionHistory = typeof nextOptions.loadVersionHistory === 'function'
        ? nextOptions.loadVersionHistory
        : defaultLoadVersionHistory;
      const reportLoadError = typeof nextOptions.reportLoadError === 'function'
        ? nextOptions.reportLoadError
        : defaultReportLoadError;

      try {
        await loadVersionHistory(
          requestedPresentationUrl,
          createLoadOptions(requestedPresentationUrl, requestedSessionToken)
        );
      } catch (error) {
        reportLoadError(error, requestedPresentationUrl, requestedSessionToken);
      }

      return undefined;
    };
  }

  async function loadStudioVersionHistory(presentationUrl = '', options = {}) {
    const requestedPresentationUrl = normalizeString(presentationUrl);
    if (!requestedPresentationUrl) {
      return [];
    }

    const fetchImpl = typeof options.fetchImpl === 'function'
      ? options.fetchImpl
      : root && typeof root.fetch === 'function'
        ? root.fetch.bind(root)
        : null;
    if (!fetchImpl) {
      return [];
    }

    const getCurrentPresentationUrl = typeof options.getCurrentPresentationUrl === 'function'
      ? options.getCurrentPresentationUrl
      : () => options.currentPresentationUrl;
    const requestedSessionToken = normalizeSessionToken(options.sessionToken);
    const response = await fetchImpl(`/api/versions?htmlPath=${encodeURIComponent(requestedPresentationUrl)}`, {
      cache: 'no-store',
      ...(options.requestInit || {})
    });
    if (!response.ok) {
      throw new Error(`Version history request failed with status ${response.status}`);
    }

    const payload = await response.json();
    const versions = Array.isArray(payload) ? payload : [];
    const getCurrentSessionToken = typeof options.getCurrentSessionToken === 'function'
      ? options.getCurrentSessionToken
      : () => options.currentSessionToken;
    if (typeof options.commitVersionEntries === 'function'
      && normalizeString(getCurrentPresentationUrl()) === requestedPresentationUrl
      && (requestedSessionToken === null || normalizeSessionToken(getCurrentSessionToken()) === requestedSessionToken)) {
      options.commitVersionEntries(versions);
    }

    return versions;
  }

  return {
    deriveStudioVersionDeckBaseName,
    createStudioVersionHistoryLoadOptionsBuilder,
    createStudioVersionHistoryLoader,
    loadStudioVersionHistory
  };
});
