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
