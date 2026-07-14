const test = require('node:test');
const assert = require('node:assert/strict');

const modalVisibility = require('../shared/studio-modal-visibility.js');

function createModal() {
  return {
    __slideNextModalVisibilityToken: 0,
    hidden: false
  };
}

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

test('createStudioModalVisibilityGuard returns a session checker for the captured modal token', () => {
  const modalEl = createModal();

  modalVisibility.cancelStudioModalHide(modalEl);
  const currentSessionGuard = modalVisibility.createStudioModalVisibilityGuard(
    modalEl,
    modalVisibility.getCurrentStudioModalVisibilityToken(modalEl)
  );
  const missingModalGuard = modalVisibility.createStudioModalVisibilityGuard(null, 0);

  assert.equal(currentSessionGuard(), true);
  assert.equal(missingModalGuard(), true);

  modalVisibility.cancelStudioModalHide(modalEl);
  assert.equal(currentSessionGuard(), false);
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

test('createStudioModalChromeController centralizes modal class transitions', () => {
  const modalEl = {
    classList: createClassList(['hidden', 'opacity-0']),
    offsetHeight: 0
  };
  const contentEl = {
    classList: createClassList(['scale-95'])
  };
  const calls = [];
  let scheduledCallback = null;
  const controller = modalVisibility.createStudioModalChromeController({
    modalVisibility: {
      cancelStudioModalHide(modal) {
        calls.push(['cancel', modal]);
      },
      scheduleStudioModalCallback(modal, options) {
        calls.push(['show-delay', modal, options.delayMs]);
        scheduledCallback = options.callback;
      },
      scheduleStudioModalHide(modal, options) {
        calls.push(['hide-delay', modal, options.hideDelayMs]);
        options.onHide();
      }
    }
  });

  controller.show(modalEl, contentEl, { delayMs: 10 });
  assert.equal(modalEl.classList.contains('hidden'), false);
  assert.equal(modalEl.classList.contains('opacity-0'), true);
  assert.equal(contentEl.classList.contains('scale-95'), true);
  scheduledCallback();
  assert.equal(modalEl.classList.contains('opacity-100'), true);
  assert.equal(contentEl.classList.contains('scale-100'), true);

  controller.hide(modalEl, contentEl);
  assert.equal(modalEl.classList.contains('hidden'), true);
  assert.equal(modalEl.classList.contains('opacity-0'), true);
  assert.equal(contentEl.classList.contains('scale-95'), true);

  controller.hideImmediately(modalEl, contentEl);
  assert.deepEqual(calls, [
    ['cancel', modalEl],
    ['show-delay', modalEl, 10],
    ['hide-delay', modalEl, 200],
    ['cancel', modalEl]
  ]);
});
