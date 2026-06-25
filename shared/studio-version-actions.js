(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioVersionActions = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function normalizeString(value, fallback = '') {
    return typeof value === 'string' ? value : fallback;
  }

  function createStudioVersionActionContext(presentationUrl = '', presentationTitle = '', presentationCategory = '') {
    return {
      presentationUrl: normalizeString(presentationUrl),
      presentationTitle: normalizeString(presentationTitle),
      presentationCategory: normalizeString(presentationCategory)
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

    return normalizeString(getCurrentPresentationUrl()) === requestedPresentationUrl;
  }

  function handleStudioRestoreVersionSuccess(context = {}, options = {}) {
    if (!isStudioVersionActionCurrent(context, options)) {
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

  return {
    createStudioVersionActionContext,
    isStudioVersionActionCurrent,
    handleStudioRestoreVersionSuccess
  };
});
