(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorPersistence = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function normalizeString(value, fallback = '') {
    return typeof value === 'string' ? value : fallback;
  }

  function asPlainObject(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return {};
    }
    return { ...value };
  }

  function normalizeSessionToken(value) {
    return Number.isInteger(value) ? value : null;
  }

  function createStudioPersistenceActionContext(presentationUrl = '', cleanHtml = '', options = {}) {
    const context = {
      presentationUrl: normalizeString(presentationUrl),
      cleanHtml: normalizeString(cleanHtml),
      shouldUpdatePersistedHtml: options.shouldUpdatePersistedHtml !== false
    };
    const canonicalDeck = asPlainObject(options.canonicalDeck);
    const isCanonicalDeck = typeof options.isCanonicalDeck === 'function'
      ? options.isCanonicalDeck
      : () => true;
    if (Array.isArray(canonicalDeck.slides) && isCanonicalDeck(canonicalDeck)) {
      context.canonicalDeck = canonicalDeck;
    }
    const sessionToken = normalizeSessionToken(options.sessionToken);
    if (sessionToken !== null) {
      context.sessionToken = sessionToken;
    }
    return context;
  }

  function buildStudioSaveRequestBody(presentationUrl = '', cleanHtml = '', options = {}) {
    const body = {
      htmlPath: normalizeString(presentationUrl),
      htmlContent: normalizeString(cleanHtml),
      isAutoSave: !!options.isAutoSave
    };
    const versionLabel = normalizeString(options.versionLabel);
    if (versionLabel) {
      body.versionLabel = versionLabel;
    }

    const canonicalDeck = asPlainObject(options.canonicalDeck);
    const isCanonicalDeck = typeof options.isCanonicalDeck === 'function'
      ? options.isCanonicalDeck
      : () => true;
    if (Array.isArray(canonicalDeck.slides) && isCanonicalDeck(canonicalDeck)) {
      body.canonicalDeck = canonicalDeck;
    }

    return body;
  }

  function isStudioPersistenceActionCurrent(context = {}, options = {}) {
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

  function handleStudioPersistenceSuccess(context = {}, options = {}) {
    if (!isStudioPersistenceActionCurrent(context, options)) {
      return false;
    }

    if (context.shouldUpdatePersistedHtml !== false && typeof options.setPersistedHtml === 'function') {
      options.setPersistedHtml(context.cleanHtml);
    }
    if (context.canonicalDeck && typeof options.setPersistedCanonicalDeck === 'function') {
      options.setPersistedCanonicalDeck(context.canonicalDeck);
    }
    if (typeof options.onSuccess === 'function') {
      options.onSuccess(context);
    }

    return true;
  }

  function handleStudioPersistenceFailure(context = {}, options = {}) {
    if (!isStudioPersistenceActionCurrent(context, options)) {
      return false;
    }

    if (typeof options.onFailure === 'function') {
      options.onFailure(context);
    }

    return true;
  }

  return {
    createStudioPersistenceActionContext,
    buildStudioSaveRequestBody,
    isStudioPersistenceActionCurrent,
    handleStudioPersistenceSuccess,
    handleStudioPersistenceFailure
  };
});
