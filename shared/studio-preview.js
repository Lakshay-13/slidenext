(function (root, factory) {
  const modalVisibility = typeof module === 'object' && module.exports
    ? require('./studio-modal-visibility')
    : root && root.SlideNextStudioModalVisibility;
  const api = factory(root, modalVisibility);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioPreview = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root, modalVisibility) {
  function runAnimationFrame(callback) {
    if (root && typeof root.requestAnimationFrame === 'function') {
      root.requestAnimationFrame(callback);
      return;
    }
    setTimeout(callback, 0);
  }

  function getNextPresentationFrameLoadToken(iframeEl) {
    if (!iframeEl) return 0;
    const currentToken = Number.isInteger(iframeEl.__slideNextPreviewLoadToken)
      ? iframeEl.__slideNextPreviewLoadToken
      : 0;
    const nextToken = currentToken + 1;
    iframeEl.__slideNextPreviewLoadToken = nextToken;
    return nextToken;
  }

  function isPresentationFrameLoadCurrent(iframeEl, loadToken, options = {}) {
    if (!iframeEl || iframeEl.__slideNextPreviewLoadToken !== loadToken) {
      return false;
    }
    if (options.modalEl && options.modalEl.classList && !options.modalEl.classList.contains('active')) {
      return false;
    }
    return true;
  }

  function clearPresentationFrameLoadHandler(iframeEl) {
    if (!iframeEl) return 0;
    const nextToken = getNextPresentationFrameLoadToken(iframeEl);
    iframeEl.onload = null;
    return nextToken;
  }

  function createPresentationFrameLoadHandler(options = {}) {
    const scheduler = typeof options.scheduleCallback === 'function'
      ? options.scheduleCallback
      : (callback, delayMs) => setTimeout(callback, delayMs);
    return () => {
      scheduler(() => {
        if (!isPresentationFrameLoadCurrent(options.iframeEl, options.loadToken, options)) {
          return;
        }
        if (options.iframeEl.contentWindow && typeof options.iframeEl.contentWindow.goToSlide === 'function') {
          options.iframeEl.contentWindow.goToSlide(options.startSlideIdx);
        }
      }, options.slideReadyDelayMs);
    };
  }

  function removeIframeSources(iframeEl) {
    if (!iframeEl) return;
    iframeEl.removeAttribute('srcdoc');
    iframeEl.removeAttribute('src');
    iframeEl.src = '';
  }

  function openPresentationModalWithLoader(options = {}) {
    const {
      modalEl,
      iframeEl,
      bodyEl,
      startSlideIdx,
      slideReadyDelayMs = 300
    } = options;

    if (!modalEl || !iframeEl) {
      return { modalEl, iframeEl };
    }

    modalEl.classList.remove('hidden');
    void modalEl.offsetWidth;

    if (startSlideIdx !== undefined) {
      const loadToken = getNextPresentationFrameLoadToken(iframeEl);
      iframeEl.onload = createPresentationFrameLoadHandler({
        modalEl,
        iframeEl,
        loadToken,
        startSlideIdx,
        slideReadyDelayMs
      });
    } else {
      clearPresentationFrameLoadHandler(iframeEl);
    }

    modalEl.classList.add('active');
    modalEl.classList.remove('opacity-0', 'pointer-events-none');
    if (bodyEl && bodyEl.style) {
      bodyEl.style.overflow = 'hidden';
    }

    return { modalEl, iframeEl };
  }

  function launchPresentationUrl(options = {}) {
    const { iframeEl } = openPresentationModalWithLoader(options);
    if (!iframeEl) return;
    iframeEl.removeAttribute('srcdoc');
    iframeEl.src = options.url || '';
  }

  function launchPresentationHtml(options = {}) {
    const { iframeEl } = openPresentationModalWithLoader(options);
    if (!iframeEl) return;
    iframeEl.removeAttribute('src');
    iframeEl.srcdoc = options.html || '';
  }

  function closePresentationModal(options = {}) {
    const {
      modalEl,
      iframeEl,
      bodyEl,
      hideDelayMs = 300
    } = options;

    if (!modalEl || !iframeEl) return;

    clearPresentationFrameLoadHandler(iframeEl);
    removeIframeSources(iframeEl);
    modalEl.classList.remove('active');
    modalEl.classList.add('opacity-0', 'pointer-events-none');
    if (bodyEl && bodyEl.style) {
      bodyEl.style.overflow = '';
    }

    setTimeout(() => {
      if (!modalEl.classList.contains('active')) {
        modalEl.classList.add('hidden');
      }
    }, hideDelayMs);
  }

  function openSourceViewModal(options = {}) {
    const {
      modalEl,
      contentEl,
      textareaEl,
      sourceHtml,
      emptySourceHtml = '<!DOCTYPE html>\n<!-- No source available -->'
    } = options;

    if (!modalEl || !contentEl) return;

    if (textareaEl) {
      textareaEl.value = sourceHtml || emptySourceHtml;
      textareaEl.scrollTop = 0;
    }

    if (modalVisibility && typeof modalVisibility.cancelStudioModalHide === 'function') {
      modalVisibility.cancelStudioModalHide(modalEl);
    }
    modalEl.classList.remove('hidden');
    if (modalVisibility && typeof modalVisibility.scheduleStudioModalCallback === 'function') {
      modalVisibility.scheduleStudioModalCallback(modalEl, {
        scheduleCallback: (callback) => runAnimationFrame(callback),
        callback: () => {
          modalEl.classList.remove('opacity-0');
          contentEl.classList.remove('scale-95');
          contentEl.classList.add('scale-100');
        }
      });
      return;
    }
    runAnimationFrame(() => {
      modalEl.classList.remove('opacity-0');
      contentEl.classList.remove('scale-95');
      contentEl.classList.add('scale-100');
    });
  }

  function closeSourceViewModal(options = {}) {
    const {
      modalEl,
      contentEl,
      hideDelayMs = 180
    } = options;

    if (!modalEl || !contentEl) return;

    modalEl.classList.add('opacity-0');
    contentEl.classList.remove('scale-100');
    contentEl.classList.add('scale-95');
    if (modalVisibility && typeof modalVisibility.scheduleStudioModalHide === 'function') {
      modalVisibility.scheduleStudioModalHide(modalEl, {
        hideDelayMs,
        onHide: () => modalEl.classList.add('hidden')
      });
      return;
    }
    setTimeout(() => modalEl.classList.add('hidden'), hideDelayMs);
  }

  return {
    getNextPresentationFrameLoadToken,
    isPresentationFrameLoadCurrent,
    clearPresentationFrameLoadHandler,
    createPresentationFrameLoadHandler,
    openPresentationModalWithLoader,
    launchPresentationUrl,
    launchPresentationHtml,
    closePresentationModal,
    openSourceViewModal,
    closeSourceViewModal
  };
});
