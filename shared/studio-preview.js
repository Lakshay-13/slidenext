(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioPreview = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function runAnimationFrame(callback) {
    if (root && typeof root.requestAnimationFrame === 'function') {
      root.requestAnimationFrame(callback);
      return;
    }
    setTimeout(callback, 0);
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
      iframeEl.onload = () => {
        setTimeout(() => {
          if (iframeEl.contentWindow && typeof iframeEl.contentWindow.goToSlide === 'function') {
            iframeEl.contentWindow.goToSlide(startSlideIdx);
          }
        }, slideReadyDelayMs);
      };
    } else {
      iframeEl.onload = null;
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

    modalEl.classList.remove('hidden');
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
    setTimeout(() => modalEl.classList.add('hidden'), hideDelayMs);
  }

  return {
    openPresentationModalWithLoader,
    launchPresentationUrl,
    launchPresentationHtml,
    closePresentationModal,
    openSourceViewModal,
    closeSourceViewModal
  };
});
