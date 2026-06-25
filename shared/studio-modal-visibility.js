(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioModalVisibility = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function getNextStudioModalVisibilityToken(modalEl) {
    if (!modalEl) return 0;
    const currentToken = Number.isInteger(modalEl.__slideNextModalVisibilityToken)
      ? modalEl.__slideNextModalVisibilityToken
      : 0;
    const nextToken = currentToken + 1;
    modalEl.__slideNextModalVisibilityToken = nextToken;
    return nextToken;
  }

  function isStudioModalVisibilityCurrent(modalEl, visibilityToken) {
    return !!modalEl && modalEl.__slideNextModalVisibilityToken === visibilityToken;
  }

  function cancelStudioModalHide(modalEl) {
    return getNextStudioModalVisibilityToken(modalEl);
  }

  function scheduleStudioModalHide(modalEl, options = {}) {
    if (!modalEl) return 0;
    const scheduleCallback = typeof options.scheduleCallback === 'function'
      ? options.scheduleCallback
      : (callback, delayMs) => setTimeout(callback, delayMs);
    const hideDelayMs = Number.isFinite(options.hideDelayMs) ? options.hideDelayMs : 0;
    const visibilityToken = getNextStudioModalVisibilityToken(modalEl);

    scheduleCallback(() => {
      if (!isStudioModalVisibilityCurrent(modalEl, visibilityToken)) {
        return;
      }
      if (typeof options.onHide === 'function') {
        options.onHide();
      }
    }, hideDelayMs);

    return visibilityToken;
  }

  return {
    getNextStudioModalVisibilityToken,
    isStudioModalVisibilityCurrent,
    cancelStudioModalHide,
    scheduleStudioModalHide
  };
});
