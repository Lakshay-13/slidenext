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

  function getCurrentStudioModalVisibilityToken(modalEl) {
    if (!modalEl) return 0;
    return Number.isInteger(modalEl.__slideNextModalVisibilityToken)
      ? modalEl.__slideNextModalVisibilityToken
      : 0;
  }

  function isStudioModalVisibilityCurrent(modalEl, visibilityToken) {
    return !!modalEl && modalEl.__slideNextModalVisibilityToken === visibilityToken;
  }

  function createStudioModalVisibilityGuard(modalEl, visibilityToken) {
    return function isCurrentStudioModalVisibilitySession() {
      return !modalEl || isStudioModalVisibilityCurrent(modalEl, visibilityToken);
    };
  }

  function cancelStudioModalHide(modalEl) {
    return getNextStudioModalVisibilityToken(modalEl);
  }

  function scheduleStudioModalCallback(modalEl, options = {}) {
    if (!modalEl) return 0;
    const scheduleCallback = typeof options.scheduleCallback === 'function'
      ? options.scheduleCallback
      : (callback, delayMs) => setTimeout(callback, delayMs);
    const delayMs = Number.isFinite(options.delayMs) ? options.delayMs : 0;
    const visibilityToken = getCurrentStudioModalVisibilityToken(modalEl);

    scheduleCallback(() => {
      if (!isStudioModalVisibilityCurrent(modalEl, visibilityToken)) {
        return;
      }
      if (typeof options.callback === 'function') {
        options.callback();
      }
    }, delayMs);

    return visibilityToken;
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
    getCurrentStudioModalVisibilityToken,
    isStudioModalVisibilityCurrent,
    createStudioModalVisibilityGuard,
    cancelStudioModalHide,
    scheduleStudioModalCallback,
    scheduleStudioModalHide
  };
});
