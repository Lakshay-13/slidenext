const test = require('node:test');
const assert = require('node:assert/strict');

const preview = require('../shared/studio-preview.js');

function createClassList(initialValues = []) {
  const values = new Set(initialValues);
  return {
    add(...nextValues) {
      nextValues.forEach((value) => values.add(value));
    },
    remove(...nextValues) {
      nextValues.forEach((value) => values.delete(value));
    },
    contains(value) {
      return values.has(value);
    }
  };
}

function createIframe() {
  return {
    __slideNextPreviewLoadToken: 0,
    onload: null,
    contentWindow: {
      calls: [],
      goToSlide(index) {
        this.calls.push(index);
      }
    },
    removeAttribute() {},
    src: '',
    srcdoc: ''
  };
}

test('createPresentationFrameLoadHandler navigates to the requested slide for the active preview session', () => {
  const iframeEl = createIframe();
  const modalEl = { classList: createClassList(['active']) };
  const scheduledCallbacks = [];
  const loadToken = preview.getNextPresentationFrameLoadToken(iframeEl);
  const onload = preview.createPresentationFrameLoadHandler({
    modalEl,
    iframeEl,
    loadToken,
    startSlideIdx: 3,
    slideReadyDelayMs: 300,
    scheduleCallback(callback, delayMs) {
      scheduledCallbacks.push({ callback, delayMs });
    }
  });

  onload();

  assert.equal(scheduledCallbacks.length, 1);
  assert.equal(scheduledCallbacks[0].delayMs, 300);
  scheduledCallbacks[0].callback();
  assert.deepEqual(iframeEl.contentWindow.calls, [3]);
});

test('createPresentationFrameLoadHandler skips stale delayed slide navigation after close', () => {
  const iframeEl = createIframe();
  const modalEl = { classList: createClassList(['active']) };
  const scheduledCallbacks = [];
  const loadToken = preview.getNextPresentationFrameLoadToken(iframeEl);
  const onload = preview.createPresentationFrameLoadHandler({
    modalEl,
    iframeEl,
    loadToken,
    startSlideIdx: 5,
    slideReadyDelayMs: 300,
    scheduleCallback(callback) {
      scheduledCallbacks.push(callback);
    }
  });

  onload();
  preview.clearPresentationFrameLoadHandler(iframeEl);
  modalEl.classList.remove('active');
  scheduledCallbacks[0]();

  assert.deepEqual(iframeEl.contentWindow.calls, []);
});

test('closePresentationModal clears the preview load handler before removing sources', () => {
  const iframeEl = createIframe();
  iframeEl.onload = () => {};
  preview.getNextPresentationFrameLoadToken(iframeEl);
  const modalEl = { classList: createClassList(['active']) };

  preview.closePresentationModal({
    modalEl,
    iframeEl,
    hideDelayMs: 0
  });

  assert.equal(iframeEl.onload, null);
  assert.equal(modalEl.classList.contains('active'), false);
});

test('openPresentationModalWithContent applies url launches through the shared modal loader', () => {
  const iframeEl = createIframe();
  const modalEl = {
    classList: createClassList(['hidden', 'opacity-0', 'pointer-events-none'])
  };
  const bodyEl = {
    style: {
      overflow: ''
    }
  };

  preview.openPresentationModalWithContent({
    modalEl,
    iframeEl,
    bodyEl,
    contentType: 'url',
    url: '/presentations/onboarding-presentation/index.html',
    startSlideIdx: 2
  });

  assert.equal(iframeEl.src, '/presentations/onboarding-presentation/index.html');
  assert.equal(typeof iframeEl.onload, 'function');
  assert.equal(modalEl.classList.contains('active'), true);
  assert.equal(bodyEl.style.overflow, 'hidden');
});

test('openPresentationModalWithContent applies html launches through the shared modal loader', () => {
  const iframeEl = createIframe();
  const modalEl = {
    classList: createClassList(['hidden', 'opacity-0', 'pointer-events-none'])
  };
  const bodyEl = {
    style: {
      overflow: ''
    }
  };

  preview.openPresentationModalWithContent({
    modalEl,
    iframeEl,
    bodyEl,
    contentType: 'html',
    html: '<html>preview</html>',
    startSlideIdx: 1
  });

  assert.equal(iframeEl.srcdoc, '<html>preview</html>');
  assert.equal(typeof iframeEl.onload, 'function');
  assert.equal(modalEl.classList.contains('active'), true);
  assert.equal(bodyEl.style.overflow, 'hidden');
});

test('launchStudioPresentation prefers preview html over the presentation url when both are available', () => {
  const iframeEl = createIframe();
  const modalEl = {
    classList: createClassList(['hidden', 'opacity-0', 'pointer-events-none'])
  };
  const bodyEl = {
    style: {
      overflow: ''
    }
  };

  const result = preview.launchStudioPresentation({
    modalEl,
    iframeEl,
    bodyEl,
    presentationUrl: '/presentations/onboarding-presentation/index.html',
    previewHtml: '<html>preview</html>',
    startSlideIdx: 2
  });

  assert.equal(result, 'html');
  assert.equal(iframeEl.srcdoc, '<html>preview</html>');
  assert.equal(iframeEl.src, '');
});

test('launchStudioPresentation falls back to the presentation url when no preview html is available', () => {
  const iframeEl = createIframe();
  const modalEl = {
    classList: createClassList(['hidden', 'opacity-0', 'pointer-events-none'])
  };
  const bodyEl = {
    style: {
      overflow: ''
    }
  };

  const result = preview.launchStudioPresentation({
    modalEl,
    iframeEl,
    bodyEl,
    presentationUrl: '/presentations/onboarding-presentation/index.html',
    previewHtml: '',
    startSlideIdx: 2
  });

  assert.equal(result, 'url');
  assert.equal(iframeEl.src, '/presentations/onboarding-presentation/index.html');
  assert.equal(iframeEl.srcdoc, '');
});

test('resetPresentationModal clears preview state immediately', () => {
  const iframeEl = createIframe();
  iframeEl.onload = () => {};
  iframeEl.src = '/presentations/stale/index.html';
  iframeEl.srcdoc = '<html>stale preview</html>';
  preview.getNextPresentationFrameLoadToken(iframeEl);
  const modalEl = { classList: createClassList(['active', 'opacity-100']) };
  const bodyEl = {
    style: {
      overflow: 'hidden'
    }
  };
  const fullscreenIconEl = {
    textContent: 'fullscreen_exit'
  };

  preview.resetPresentationModal({
    modalEl,
    iframeEl,
    bodyEl,
    fullscreenIconEl
  });

  assert.equal(iframeEl.onload, null);
  assert.equal(iframeEl.src, '');
  assert.equal(iframeEl.srcdoc, '');
  assert.equal(modalEl.classList.contains('active'), false);
  assert.equal(modalEl.classList.contains('hidden'), true);
  assert.equal(modalEl.classList.contains('opacity-0'), true);
  assert.equal(modalEl.classList.contains('pointer-events-none'), true);
  assert.equal(modalEl.classList.contains('opacity-100'), false);
  assert.equal(bodyEl.style.overflow, '');
  assert.equal(fullscreenIconEl.textContent, 'fullscreen');
});

test('resetStudioPresentationUiState resolves preview chrome from the document and exits fullscreen', () => {
  const iframeEl = createIframe();
  iframeEl.onload = () => {};
  iframeEl.src = '/presentations/stale/index.html';
  iframeEl.srcdoc = '<html>stale preview</html>';
  preview.getNextPresentationFrameLoadToken(iframeEl);
  const modalEl = { classList: createClassList(['active', 'opacity-100']) };
  const bodyEl = {
    style: {
      overflow: 'hidden'
    }
  };
  const fullscreenIconEl = {
    textContent: 'fullscreen_exit'
  };
  let exitFullscreenCalls = 0;
  const documentStub = {
    body: bodyEl,
    fullscreenElement: modalEl,
    getElementById(id) {
      switch (id) {
        case 'presentationModal':
          return modalEl;
        case 'presentationFrame':
          return iframeEl;
        case 'fsIcon':
          return fullscreenIconEl;
        default:
          return null;
      }
    },
    exitFullscreen() {
      exitFullscreenCalls += 1;
      this.fullscreenElement = null;
      return Promise.resolve();
    }
  };

  preview.resetStudioPresentationUiState({
    document: documentStub
  });

  assert.equal(exitFullscreenCalls, 1);
  assert.equal(documentStub.fullscreenElement, null);
  assert.equal(iframeEl.onload, null);
  assert.equal(iframeEl.src, '');
  assert.equal(iframeEl.srcdoc, '');
  assert.equal(modalEl.classList.contains('active'), false);
  assert.equal(modalEl.classList.contains('hidden'), true);
  assert.equal(modalEl.classList.contains('opacity-0'), true);
  assert.equal(modalEl.classList.contains('pointer-events-none'), true);
  assert.equal(modalEl.classList.contains('opacity-100'), false);
  assert.equal(bodyEl.style.overflow, '');
  assert.equal(fullscreenIconEl.textContent, 'fullscreen');
});

test('openStudioSourceView skips lazy source generation when the source view button is disabled', () => {
  let resolveSourceHtmlCalls = 0;
  const documentStub = {
    getElementById(id) {
      switch (id) {
        case 'openSourceViewBtn':
          return { disabled: true };
        case 'sourceViewModal':
          return { classList: createClassList(['hidden']) };
        case 'sourceViewModalContent':
          return { classList: createClassList(['scale-95']) };
        case 'sourceViewContent':
          return { value: '', scrollTop: 0 };
        default:
          return null;
      }
    }
  };

  const didOpen = preview.openStudioSourceView({
    document: documentStub,
    resolveSourceHtml() {
      resolveSourceHtmlCalls += 1;
      return '<html>source</html>';
    }
  });

  assert.equal(didOpen, false);
  assert.equal(resolveSourceHtmlCalls, 0);
});

test('openStudioSourceView resolves source modal chrome from the document', async () => {
  const modalEl = { classList: createClassList(['hidden', 'opacity-0']) };
  const contentEl = { classList: createClassList(['scale-95']) };
  const textareaEl = {
    value: '',
    scrollTop: 12
  };
  const documentStub = {
    getElementById(id) {
      switch (id) {
        case 'openSourceViewBtn':
          return { disabled: false };
        case 'sourceViewModal':
          return modalEl;
        case 'sourceViewModalContent':
          return contentEl;
        case 'sourceViewContent':
          return textareaEl;
        default:
          return null;
      }
    }
  };

  const didOpen = preview.openStudioSourceView({
    document: documentStub,
    sourceHtml: '<html>source</html>'
  });
  await new Promise((resolve) => setTimeout(resolve, 0));

  assert.equal(didOpen, true);
  assert.equal(textareaEl.value, '<html>source</html>');
  assert.equal(textareaEl.scrollTop, 0);
  assert.equal(modalEl.classList.contains('hidden'), false);
  assert.equal(modalEl.classList.contains('opacity-0'), false);
  assert.equal(contentEl.classList.contains('scale-95'), false);
  assert.equal(contentEl.classList.contains('scale-100'), true);
});

test('resetSourceViewModal clears source modal state immediately', () => {
  const modalEl = { classList: createClassList(['opacity-100']) };
  const contentEl = { classList: createClassList(['scale-100']) };
  const textareaEl = {
    value: '<html>stale</html>',
    scrollTop: 40
  };
  const tokenBefore = 0;

  preview.resetSourceViewModal({
    modalEl,
    contentEl,
    textareaEl
  });

  assert.equal(textareaEl.value, '');
  assert.equal(textareaEl.scrollTop, 0);
  assert.equal(modalEl.classList.contains('hidden'), true);
  assert.equal(modalEl.classList.contains('opacity-0'), true);
  assert.equal(modalEl.classList.contains('opacity-100'), false);
  assert.equal(contentEl.classList.contains('scale-95'), true);
  assert.equal(contentEl.classList.contains('scale-100'), false);
  assert.equal(modalEl.__slideNextModalVisibilityToken, tokenBefore + 1);
});

test('closeStudioSourceView resolves source modal chrome from the document', async () => {
  const modalEl = { classList: createClassList([]) };
  const contentEl = { classList: createClassList(['scale-100']) };
  const documentStub = {
    getElementById(id) {
      switch (id) {
        case 'sourceViewModal':
          return modalEl;
        case 'sourceViewModalContent':
          return contentEl;
        default:
          return null;
      }
    }
  };

  preview.closeStudioSourceView({
    document: documentStub,
    hideDelayMs: 0
  });
  await new Promise((resolve) => setTimeout(resolve, 0));

  assert.equal(modalEl.classList.contains('opacity-0'), true);
  assert.equal(modalEl.classList.contains('hidden'), true);
  assert.equal(contentEl.classList.contains('scale-95'), true);
  assert.equal(contentEl.classList.contains('scale-100'), false);
});

test('resetStudioSourceViewUiState resolves source modal chrome from the document', () => {
  const modalEl = { classList: createClassList(['opacity-100']) };
  const contentEl = { classList: createClassList(['scale-100']) };
  const textareaEl = {
    value: '<html>stale</html>',
    scrollTop: 40
  };
  const tokenBefore = 0;
  const documentStub = {
    getElementById(id) {
      switch (id) {
        case 'sourceViewModal':
          return modalEl;
        case 'sourceViewModalContent':
          return contentEl;
        case 'sourceViewContent':
          return textareaEl;
        default:
          return null;
      }
    }
  };

  preview.resetStudioSourceViewUiState({
    document: documentStub
  });

  assert.equal(textareaEl.value, '');
  assert.equal(textareaEl.scrollTop, 0);
  assert.equal(modalEl.classList.contains('hidden'), true);
  assert.equal(modalEl.classList.contains('opacity-0'), true);
  assert.equal(modalEl.classList.contains('opacity-100'), false);
  assert.equal(contentEl.classList.contains('scale-95'), true);
  assert.equal(contentEl.classList.contains('scale-100'), false);
  assert.equal(modalEl.__slideNextModalVisibilityToken, tokenBefore + 1);
});
