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
  function resolvePreviewDocument(options = {}) {
    if (options.document && typeof options.document.getElementById === 'function') {
      return options.document;
    }
    if (root && root.document && typeof root.document.getElementById === 'function') {
      return root.document;
    }
    return null;
  }

  function resolvePreviewDocumentElement(documentRef, id) {
    if (!documentRef || typeof documentRef.getElementById !== 'function') {
      return null;
    }
    return documentRef.getElementById(id);
  }

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
    iframeEl.srcdoc = '';
    iframeEl.removeAttribute('src');
    iframeEl.src = '';
  }

  function openPresentationModalWithLoader(options = {}) {
    const documentRef = resolvePreviewDocument(options);
    const modalEl = options.modalEl || resolvePreviewDocumentElement(documentRef, 'presentationModal');
    const iframeEl = options.iframeEl || resolvePreviewDocumentElement(documentRef, 'presentationFrame');
    const bodyEl = options.bodyEl || (documentRef && documentRef.body ? documentRef.body : null);
    const startSlideIdx = options.startSlideIdx;
    const slideReadyDelayMs = Number.isFinite(options.slideReadyDelayMs) ? options.slideReadyDelayMs : 300;

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

  function openPresentationModalWithContent(options = {}) {
    const { iframeEl } = openPresentationModalWithLoader(options);
    if (!iframeEl) {
      return { modalEl: options.modalEl, iframeEl };
    }

    if (options.contentType === 'url') {
      iframeEl.removeAttribute('srcdoc');
      iframeEl.src = options.url || '';
      return { modalEl: options.modalEl, iframeEl };
    }

    iframeEl.removeAttribute('src');
    iframeEl.srcdoc = options.html || '';
    return { modalEl: options.modalEl, iframeEl };
  }

  function launchPresentationUrl(options = {}) {
    openPresentationModalWithContent({
      ...options,
      contentType: 'url'
    });
  }

  function launchPresentationHtml(options = {}) {
    openPresentationModalWithContent({
      ...options,
      contentType: 'html'
    });
  }

  function launchStudioPresentation(options = {}) {
    const previewHtml = typeof options.previewHtml === 'string'
      ? options.previewHtml
      : '';
    if (previewHtml) {
      launchPresentationHtml({
        ...options,
        html: previewHtml
      });
      return 'html';
    }

    const presentationUrl = typeof options.presentationUrl === 'string'
      ? options.presentationUrl
      : '';
    if (!presentationUrl) {
      return '';
    }

    launchPresentationUrl({
      ...options,
      url: presentationUrl
    });
    return 'url';
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

  function resetPresentationModal(options = {}) {
    const {
      modalEl,
      iframeEl,
      bodyEl,
      fullscreenIconEl
    } = options;

    clearPresentationFrameLoadHandler(iframeEl);
    removeIframeSources(iframeEl);
    if (modalEl) {
      modalEl.classList.remove('active', 'opacity-100');
      modalEl.classList.add('hidden', 'opacity-0', 'pointer-events-none');
    }
    if (bodyEl && bodyEl.style) {
      bodyEl.style.overflow = '';
    }
    if (fullscreenIconEl) {
      fullscreenIconEl.textContent = 'fullscreen';
    }
  }

  function resetStudioPresentationUiState(options = {}) {
    const documentRef = resolvePreviewDocument(options);
    const modalEl = options.modalEl || resolvePreviewDocumentElement(documentRef, 'presentationModal');
    if (
      documentRef
      && documentRef.fullscreenElement === modalEl
      && typeof documentRef.exitFullscreen === 'function'
    ) {
      const fullscreenExitResult = documentRef.exitFullscreen();
      if (fullscreenExitResult && typeof fullscreenExitResult.catch === 'function') {
        fullscreenExitResult.catch(() => {});
      }
    }
    resetPresentationModal({
      modalEl,
      iframeEl: options.iframeEl || resolvePreviewDocumentElement(documentRef, 'presentationFrame'),
      bodyEl: options.bodyEl || (documentRef && documentRef.body ? documentRef.body : null),
      fullscreenIconEl: options.fullscreenIconEl || resolvePreviewDocumentElement(documentRef, 'fsIcon')
    });
  }

  function syncStudioFullscreenIcon(options = {}) {
    const documentRef = resolvePreviewDocument(options);
    const fullscreenIconEl = options.fullscreenIconEl || resolvePreviewDocumentElement(documentRef, 'fsIcon');
    if (!fullscreenIconEl) return false;
    fullscreenIconEl.textContent = documentRef && documentRef.fullscreenElement
      ? 'fullscreen_exit'
      : 'fullscreen';
    return true;
  }

  function toggleStudioPresentationFullscreen(options = {}) {
    const documentRef = resolvePreviewDocument(options);
    const modalEl = options.modalEl || resolvePreviewDocumentElement(documentRef, 'presentationModal');
    const fullscreenIconEl = options.fullscreenIconEl || resolvePreviewDocumentElement(documentRef, 'fsIcon');
    if (!documentRef || !modalEl) return false;

    const consoleRef = options.consoleRef || (root && root.console);
    const reportRequestFailure = (error) => {
      if (consoleRef && typeof consoleRef.error === 'function') {
        consoleRef.error('Fullscreen request failed:', error);
      }
    };

    if (!documentRef.fullscreenElement) {
      if (typeof modalEl.requestFullscreen !== 'function') return false;
      let requestResult;
      try {
        requestResult = modalEl.requestFullscreen();
      } catch (error) {
        reportRequestFailure(error);
        return false;
      }
      if (requestResult && typeof requestResult.then === 'function') {
        requestResult
          .then(() => {
            if (fullscreenIconEl) fullscreenIconEl.textContent = 'fullscreen_exit';
          })
          .catch(reportRequestFailure);
      } else if (fullscreenIconEl) {
        fullscreenIconEl.textContent = 'fullscreen_exit';
      }
      return true;
    }

    if (typeof documentRef.exitFullscreen !== 'function') return false;
    let exitResult;
    try {
      exitResult = documentRef.exitFullscreen();
    } catch (error) {
      return false;
    }
    if (exitResult && typeof exitResult.then === 'function') {
      exitResult.then(() => {
        if (fullscreenIconEl) fullscreenIconEl.textContent = 'fullscreen';
      });
    } else if (fullscreenIconEl) {
      fullscreenIconEl.textContent = 'fullscreen';
    }
    return true;
  }

  function clearSourceViewError(errorEl) {
    if (!errorEl) return false;
    errorEl.textContent = '';
    if (errorEl.classList && typeof errorEl.classList.add === 'function') {
      errorEl.classList.add('hidden');
    }
    return true;
  }

  function renderSourceViewError(errorEl, message = 'Source HTML could not be applied') {
    if (!errorEl) return false;
    errorEl.textContent = message;
    if (errorEl.classList && typeof errorEl.classList.remove === 'function') {
      errorEl.classList.remove('hidden');
    }
    return true;
  }

  function normalizeSourceViewMode(mode) {
    return `${mode}`.trim().toLowerCase() === 'css' ? 'css' : 'html';
  }

  function getSourceViewMode(modalEl) {
    if (!modalEl) return 'html';
    if (modalEl.dataset && typeof modalEl.dataset.sourceMode === 'string') {
      return normalizeSourceViewMode(modalEl.dataset.sourceMode);
    }
    if (typeof modalEl.getAttribute === 'function') {
      return normalizeSourceViewMode(modalEl.getAttribute('data-source-mode') || 'html');
    }
    return 'html';
  }

  function setSourceViewMode(modalEl, mode) {
    if (!modalEl) return 'html';
    const normalizedMode = normalizeSourceViewMode(mode);
    if (modalEl.dataset) modalEl.dataset.sourceMode = normalizedMode;
    if (typeof modalEl.setAttribute === 'function') {
      modalEl.setAttribute('data-source-mode', normalizedMode);
    }
    return normalizedMode;
  }

  function resolveSourceViewElements(documentRef, options = {}) {
    return {
      modalEl: options.modalEl || resolvePreviewDocumentElement(documentRef, 'sourceViewModal'),
      contentEl: options.contentEl || resolvePreviewDocumentElement(documentRef, 'sourceViewModalContent'),
      textareaEl: options.textareaEl || resolvePreviewDocumentElement(documentRef, 'sourceViewContent'),
      htmlTabEl: options.htmlTabEl || resolvePreviewDocumentElement(documentRef, 'sourceViewHtmlTab'),
      cssTabEl: options.cssTabEl || resolvePreviewDocumentElement(documentRef, 'sourceViewCssTab'),
      modeLabelEl: options.modeLabelEl || resolvePreviewDocumentElement(documentRef, 'sourceViewModeLabel')
    };
  }

  function syncSourceViewModeUi(options = {}) {
    const mode = normalizeSourceViewMode(options.mode);
    const activeClassName = options.activeClassName || 'bg-white/10';
    const inactiveClassName = options.inactiveClassName || 'text-zinc-500';
    const htmlTabEl = options.htmlTabEl;
    const cssTabEl = options.cssTabEl;
    [[htmlTabEl, mode === 'html'], [cssTabEl, mode === 'css']].forEach(([tab, isActive]) => {
      if (!tab) return;
      if (tab.classList) {
        if (isActive) {
          tab.classList.add(activeClassName);
          tab.classList.remove(inactiveClassName);
        } else {
          tab.classList.remove(activeClassName);
          tab.classList.add(inactiveClassName);
        }
      }
      if (typeof tab.setAttribute === 'function') {
        tab.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      }
    });
    if (options.modeLabelEl) {
      options.modeLabelEl.textContent = mode === 'css' ? 'CSS' : 'HTML';
    }
    if (options.textareaEl && typeof options.textareaEl.setAttribute === 'function') {
      options.textareaEl.setAttribute('aria-label', `${mode.toUpperCase()} source editor`);
    }
    return true;
  }

  function getSourceViewBuffers(modalEl) {
    if (!modalEl) return {};
    if (!modalEl.__slideNextSourceBuffers || typeof modalEl.__slideNextSourceBuffers !== 'object') {
      modalEl.__slideNextSourceBuffers = {};
    }
    return modalEl.__slideNextSourceBuffers;
  }

  function resolveSourceViewBuffer(options = {}, mode) {
    const normalizedMode = normalizeSourceViewMode(mode);
    if (normalizedMode === 'css' && typeof options.resolveSourceCss === 'function') {
      return options.resolveSourceCss();
    }
    if (normalizedMode === 'html' && typeof options.resolveSourceHtml === 'function') {
      return options.resolveSourceHtml();
    }
    return normalizedMode === 'css' ? options.sourceCss : options.sourceHtml;
  }

  function renderSourceViewMode(options = {}) {
    const modalEl = options.modalEl;
    const textareaEl = options.textareaEl;
    if (!modalEl || !textareaEl) return false;
    const mode = getSourceViewMode(modalEl);
    const buffers = getSourceViewBuffers(modalEl);
    if (!Object.prototype.hasOwnProperty.call(buffers, mode)) {
      const resolvedBuffer = resolveSourceViewBuffer(options, mode);
      buffers[mode] = typeof resolvedBuffer === 'string'
        ? resolvedBuffer
        : (mode === 'html' ? (options.emptySourceHtml || '<!DOCTYPE html>\n<!-- No source available -->') : '');
    }
    textareaEl.value = buffers[mode];
    textareaEl.readOnly = options.editable !== true;
    textareaEl.scrollTop = 0;
    syncSourceViewModeUi({
      ...options,
      mode,
      textareaEl
    });
    return true;
  }

  function setStudioSourceViewMode(options = {}) {
    const documentRef = resolvePreviewDocument(options);
    const elements = resolveSourceViewElements(documentRef, options);
    if (!elements.modalEl || !elements.textareaEl) return false;
    const currentMode = getSourceViewMode(elements.modalEl);
    const buffers = getSourceViewBuffers(elements.modalEl);
    buffers[currentMode] = typeof elements.textareaEl.value === 'string'
      ? elements.textareaEl.value
      : '';
    const nextMode = setSourceViewMode(elements.modalEl, options.mode);
    return renderSourceViewMode({
      ...options,
      ...elements,
      mode: nextMode
    });
  }

  function openSourceViewModal(options = {}) {
    const {
      modalEl,
      contentEl,
      textareaEl,
      errorEl,
      sourceHtml,
      sourceCss,
      editable = false,
      emptySourceHtml = '<!DOCTYPE html>\n<!-- No source available -->',
      sourceMode = 'html'
    } = options;

    if (!modalEl || !contentEl) return;

    clearSourceViewError(errorEl);
    if (modalEl) {
      modalEl.__slideNextSourceBuffers = {
        html: typeof sourceHtml === 'string' && sourceHtml ? sourceHtml : emptySourceHtml,
        css: typeof sourceCss === 'string' ? sourceCss : ''
      };
      setSourceViewMode(modalEl, sourceMode);
    }
    renderSourceViewMode({ ...options, modalEl, contentEl, textareaEl, editable });

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

  function openStudioSourceView(options = {}) {
    const documentRef = resolvePreviewDocument(options);
    const hasExplicitOpenPermission = typeof options.canOpenSourceView === 'boolean';
    if (hasExplicitOpenPermission && !options.canOpenSourceView) {
      return false;
    }
    const sourceViewBtnEl = options.sourceViewBtnEl || resolvePreviewDocumentElement(documentRef, 'openSourceViewBtn');
    if (!hasExplicitOpenPermission && sourceViewBtnEl && sourceViewBtnEl.disabled) {
      return false;
    }

    const sourceViewElements = resolveSourceViewElements(documentRef, options);
    const { modalEl, contentEl, textareaEl } = sourceViewElements;
    const errorEl = options.errorEl || resolvePreviewDocumentElement(documentRef, 'sourceViewError');
    if (!modalEl || !contentEl || !textareaEl) {
      return false;
    }

    const sourceHtml = typeof options.resolveSourceHtml === 'function'
      ? options.resolveSourceHtml()
      : options.sourceHtml;
    const sourceCss = typeof options.resolveSourceCss === 'function'
      ? options.resolveSourceCss()
      : options.sourceCss;
    openSourceViewModal({
      ...options,
      ...sourceViewElements,
      errorEl,
      sourceHtml,
      sourceCss
    });
    return true;
  }

  function getSourceViewApplyMode(options = {}) {
    const documentRef = resolvePreviewDocument(options);
    const elements = resolveSourceViewElements(documentRef, options);
    const mode = getSourceViewMode(elements.modalEl);
    return { ...elements, mode };
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

  function closeStudioSourceView(options = {}) {
    const documentRef = resolvePreviewDocument(options);
    closeSourceViewModal({
      ...options,
      modalEl: options.modalEl || resolvePreviewDocumentElement(documentRef, 'sourceViewModal'),
      contentEl: options.contentEl || resolvePreviewDocumentElement(documentRef, 'sourceViewModalContent')
    });
  }

  function applySourceViewModal(options = {}) {
    const documentRef = resolvePreviewDocument(options);
    const applyMode = getSourceViewApplyMode(options);
    const textareaEl = applyMode.textareaEl;
    const errorEl = options.errorEl || resolvePreviewDocumentElement(documentRef, 'sourceViewError');
    const applyCallback = applyMode.mode === 'css'
      ? options.onApplySourceCss
      : options.onApplySourceHtml;
    if (!textareaEl || typeof applyCallback !== 'function') {
      renderSourceViewError(errorEl, 'Source editor is unavailable');
      return false;
    }

    const sourceHtml = typeof textareaEl.value === 'string' ? textareaEl.value : '';
    const buffers = getSourceViewBuffers(applyMode.modalEl);
    buffers[applyMode.mode] = sourceHtml;
    const result = applyCallback(sourceHtml);
    if (result === false || (result && result.success === false)) {
      const message = result && typeof result.error === 'string' && result.error.trim()
        ? result.error.trim()
        : applyMode.mode === 'css' ? 'Source CSS could not be applied' : 'Source HTML could not be applied';
      renderSourceViewError(errorEl, message);
      return false;
    }

    clearSourceViewError(errorEl);
    closeStudioSourceView({
      ...options,
      document: documentRef
    });
    return true;
  }

  function applyStudioSourceView(options = {}) {
    const documentRef = resolvePreviewDocument(options);
    const hasExplicitOpenPermission = typeof options.canOpenSourceView === 'boolean';
    if (hasExplicitOpenPermission && !options.canOpenSourceView) {
      return false;
    }
    const sourceViewBtnEl = options.sourceViewBtnEl || resolvePreviewDocumentElement(documentRef, 'openSourceViewBtn');
    if (!hasExplicitOpenPermission && sourceViewBtnEl && sourceViewBtnEl.disabled) {
      return false;
    }

    return applySourceViewModal({
      ...options,
      document: documentRef
    });
  }

  function resetSourceViewModal(options = {}) {
    const {
      modalEl,
      contentEl,
      textareaEl,
      errorEl
    } = options;

    clearSourceViewError(errorEl);
    if (modalEl) {
      modalEl.__slideNextSourceBuffers = {};
      setSourceViewMode(modalEl, 'html');
    }
    if (textareaEl) {
      textareaEl.value = '';
      textareaEl.scrollTop = 0;
    }
    if (modalVisibility && typeof modalVisibility.cancelStudioModalHide === 'function') {
      modalVisibility.cancelStudioModalHide(modalEl);
    }
    if (modalEl) {
      modalEl.classList.add('hidden');
      modalEl.classList.add('opacity-0');
      modalEl.classList.remove('opacity-100');
    }
    if (contentEl) {
      contentEl.classList.add('scale-95');
      contentEl.classList.remove('scale-100');
    }
  }

  function resetStudioSourceViewUiState(options = {}) {
    const documentRef = resolvePreviewDocument(options);
    const elements = resolveSourceViewElements(documentRef, options);
    resetSourceViewModal({
      ...options,
      ...elements,
      errorEl: options.errorEl || resolvePreviewDocumentElement(documentRef, 'sourceViewError')
    });
    syncSourceViewModeUi({ ...elements, mode: 'html' });
  }

  return {
    getNextPresentationFrameLoadToken,
    isPresentationFrameLoadCurrent,
    clearPresentationFrameLoadHandler,
    createPresentationFrameLoadHandler,
    openPresentationModalWithLoader,
    openPresentationModalWithContent,
    launchPresentationUrl,
    launchPresentationHtml,
    launchStudioPresentation,
    closePresentationModal,
    resetPresentationModal,
    resetStudioPresentationUiState,
    syncStudioFullscreenIcon,
    toggleStudioPresentationFullscreen,
    openSourceViewModal,
    openStudioSourceView,
    setStudioSourceViewMode,
    closeSourceViewModal,
    closeStudioSourceView,
    applySourceViewModal,
    applyStudioSourceView,
    resetSourceViewModal,
    resetStudioSourceViewUiState
  };
});
