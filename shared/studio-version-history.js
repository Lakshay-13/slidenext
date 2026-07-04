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
    loadStudioVersionHistory
  };
});
