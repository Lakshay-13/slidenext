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
