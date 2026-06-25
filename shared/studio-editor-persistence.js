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

  function createStudioPersistenceActionContext(presentationUrl = '', cleanHtml = '', options = {}) {
    return {
      presentationUrl: normalizeString(presentationUrl),
      cleanHtml: normalizeString(cleanHtml),
      shouldUpdatePersistedHtml: options.shouldUpdatePersistedHtml !== false
    };
  }

  function isStudioPersistenceActionCurrent(context = {}, options = {}) {
    const requestedPresentationUrl = normalizeString(context.presentationUrl);
    if (!requestedPresentationUrl) {
      return false;
    }

    const getCurrentPresentationUrl = typeof options.getCurrentPresentationUrl === 'function'
      ? options.getCurrentPresentationUrl
      : () => options.currentPresentationUrl;

    return normalizeString(getCurrentPresentationUrl()) === requestedPresentationUrl;
  }

  function handleStudioPersistenceSuccess(context = {}, options = {}) {
    if (!isStudioPersistenceActionCurrent(context, options)) {
      return false;
    }

    if (context.shouldUpdatePersistedHtml !== false && typeof options.setPersistedHtml === 'function') {
      options.setPersistedHtml(context.cleanHtml);
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
    isStudioPersistenceActionCurrent,
    handleStudioPersistenceSuccess,
    handleStudioPersistenceFailure
  };
});
