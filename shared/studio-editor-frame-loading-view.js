(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorFrameLoadingView = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function setStudioEditorFrameLoadingState(options = {}) {
    const documentRef = options.documentRef;
    const loadingEl = documentRef && typeof documentRef.getElementById === 'function'
      ? documentRef.getElementById('studioFrameLoading')
      : null;
    if (!loadingEl) return false;

    const state = options.state === 'ready' || options.state === 'error'
      ? options.state
      : 'loading';
    const isReady = state === 'ready';
    const textEl = documentRef && typeof documentRef.getElementById === 'function'
      ? documentRef.getElementById('studioFrameLoadingText')
      : null;
    const iconEl = documentRef && typeof documentRef.getElementById === 'function'
      ? documentRef.getElementById('studioFrameLoadingIcon')
      : null;
    const retryEl = documentRef && typeof documentRef.getElementById === 'function'
      ? documentRef.getElementById('studioFrameLoadingRetryBtn')
      : null;
    if (textEl) {
      textEl.textContent = isReady
        ? 'Presentation ready'
        : state === 'error'
          ? 'Unable to initialize this presentation.'
          : 'Loading presentation...';
    }
    if (iconEl && iconEl.classList) {
      if (state === 'loading' && typeof iconEl.classList.add === 'function') {
        iconEl.classList.add('animate-spin');
      } else if (state !== 'loading' && typeof iconEl.classList.remove === 'function') {
        iconEl.classList.remove('animate-spin');
      }
    }
    if (retryEl) {
      const isRetryable = state === 'error';
      if (retryEl.classList) {
        if (isRetryable && typeof retryEl.classList.remove === 'function') {
          retryEl.classList.remove('hidden');
        } else if (!isRetryable && typeof retryEl.classList.add === 'function') {
          retryEl.classList.add('hidden');
        }
      }
      retryEl.disabled = !isRetryable;
      if (typeof retryEl.setAttribute === 'function') {
        retryEl.setAttribute('aria-hidden', isRetryable ? 'false' : 'true');
        retryEl.setAttribute('aria-disabled', isRetryable ? 'false' : 'true');
      }
    }
    if (loadingEl.classList) {
      if (isReady && typeof loadingEl.classList.add === 'function') {
        loadingEl.classList.add('hidden');
      } else if (!isReady && typeof loadingEl.classList.remove === 'function') {
        loadingEl.classList.remove('hidden');
      }
    }
    if (typeof loadingEl.setAttribute === 'function') {
      loadingEl.setAttribute('aria-busy', state === 'loading' ? 'true' : 'false');
      loadingEl.setAttribute('aria-hidden', isReady ? 'true' : 'false');
    }
    return true;
  }

  return {
    setStudioEditorFrameLoadingState
  };
});
