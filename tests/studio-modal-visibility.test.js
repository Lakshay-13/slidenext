const test = require('node:test');
const assert = require('node:assert/strict');

const modalVisibility = require('../shared/studio-modal-visibility.js');

function createModal() {
  return {
    __slideNextModalVisibilityToken: 0,
    hidden: false
  };
}

test('scheduleStudioModalHide runs the hide callback for the current modal session', () => {
  const modalEl = createModal();
  const scheduledCallbacks = [];

  const token = modalVisibility.scheduleStudioModalHide(modalEl, {
    hideDelayMs: 200,
    scheduleCallback(callback, delayMs) {
      scheduledCallbacks.push({ callback, delayMs });
    },
    onHide() {
      modalEl.hidden = true;
    }
  });

  assert.equal(token, 1);
  assert.equal(scheduledCallbacks.length, 1);
  assert.equal(scheduledCallbacks[0].delayMs, 200);
  scheduledCallbacks[0].callback();
  assert.equal(modalEl.hidden, true);
});

test('cancelStudioModalHide prevents a stale hide callback from hiding a reopened modal', () => {
  const modalEl = createModal();
  const scheduledCallbacks = [];

  modalVisibility.scheduleStudioModalHide(modalEl, {
    scheduleCallback(callback) {
      scheduledCallbacks.push(callback);
    },
    onHide() {
      modalEl.hidden = true;
    }
  });

  modalVisibility.cancelStudioModalHide(modalEl);
  scheduledCallbacks[0]();

  assert.equal(modalEl.hidden, false);
});

test('getCurrentStudioModalVisibilityToken returns the modal visibility token without mutating it', () => {
  const modalEl = createModal();

  assert.equal(modalVisibility.getCurrentStudioModalVisibilityToken(modalEl), 0);
  modalVisibility.cancelStudioModalHide(modalEl);
  assert.equal(modalVisibility.getCurrentStudioModalVisibilityToken(modalEl), 1);
});

test('scheduleStudioModalCallback skips stale delayed callbacks after the modal session changes', () => {
  const modalEl = createModal();
  const calls = [];
  const scheduledCallbacks = [];

  modalVisibility.cancelStudioModalHide(modalEl);
  modalVisibility.scheduleStudioModalCallback(modalEl, {
    delayMs: 10,
    scheduleCallback(callback, delayMs) {
      scheduledCallbacks.push({ callback, delayMs });
    },
    callback() {
      calls.push('callback');
    }
  });

  modalVisibility.cancelStudioModalHide(modalEl);
  assert.equal(scheduledCallbacks.length, 1);
  assert.equal(scheduledCallbacks[0].delayMs, 10);
  scheduledCallbacks[0].callback();

  assert.deepEqual(calls, []);
});
