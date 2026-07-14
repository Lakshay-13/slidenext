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

  function createStudioModalChromeController(options = {}) {
    const visibility = options.modalVisibility && typeof options.modalVisibility === 'object'
      ? options.modalVisibility
      : {};
    const cancelHide = typeof visibility.cancelStudioModalHide === 'function'
      ? visibility.cancelStudioModalHide
      : cancelStudioModalHide;
    const scheduleCallback = typeof visibility.scheduleStudioModalCallback === 'function'
      ? visibility.scheduleStudioModalCallback
      : scheduleStudioModalCallback;
    const scheduleHide = typeof visibility.scheduleStudioModalHide === 'function'
      ? visibility.scheduleStudioModalHide
      : scheduleStudioModalHide;

    function show(modal, content, showOptions = {}) {
      if (!modal) {
        return;
      }
      const resolvedOptions = showOptions && typeof showOptions === 'object'
        ? showOptions
        : {};
      const applyChrome = () => {
        modal.classList.remove('opacity-0');
        modal.classList.add('opacity-100');
        if (content) {
          content.classList.remove('scale-95');
          content.classList.add('scale-100');
        }
        if (typeof resolvedOptions.onShown === 'function') {
          resolvedOptions.onShown();
        }
      };

      cancelHide(modal);
      modal.classList.remove('hidden');
      if (resolvedOptions.forceReflow) {
        modal.offsetHeight;
      }
      if (typeof resolvedOptions.delayMs === 'number' && resolvedOptions.delayMs > 0) {
        scheduleCallback(modal, {
          delayMs: resolvedOptions.delayMs,
          callback: applyChrome
        });
        return;
      }
      applyChrome();
    }

    function hide(modal, content) {
      if (modal) {
        modal.classList.remove('opacity-100');
        modal.classList.add('opacity-0');
      }
      if (content) {
        content.classList.remove('scale-100');
        content.classList.add('scale-95');
      }
      if (modal) {
        scheduleHide(modal, {
          hideDelayMs: 200,
          onHide: () => {
            modal.classList.add('hidden');
          }
        });
      }
    }

    function hideImmediately(modal, content) {
      if (modal) {
        cancelHide(modal);
        modal.classList.add('hidden');
        modal.classList.add('opacity-0');
        modal.classList.remove('opacity-100');
      }
      if (content) {
        content.classList.add('scale-95');
        content.classList.remove('scale-100');
      }
    }

    return {
      show,
      hide,
      hideImmediately
    };
  }

  return {
    getNextStudioModalVisibilityToken,
    getCurrentStudioModalVisibilityToken,
    isStudioModalVisibilityCurrent,
    createStudioModalVisibilityGuard,
    cancelStudioModalHide,
    scheduleStudioModalCallback,
    scheduleStudioModalHide,
    createStudioModalChromeController
  };
});
