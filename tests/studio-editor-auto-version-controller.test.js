const test = require('node:test');
const assert = require('node:assert/strict');
const autoVersion = require('../shared/studio-editor-auto-version-controller.js');

test('auto-version controller debounces frequent actions with captured session state', () => {
  let scheduledCallback = null;
  let timer = 'old-timer';
  const clearedTimers = [];
  const storedTimerClears = [];
  const executions = [];
  const controller = autoVersion.createStudioEditorAutoVersionController({
    versionActions: {
      STUDIO_AUTO_VERSION_TIMER_KEY: 'frequent_action',
      STUDIO_AUTO_VERSION_DEBOUNCE_MS: 10000,
      shouldDebounceStudioAutoVersion: () => true
    },
    captureSessionState: () => ({
      presentationUrl: '/deck/index.html',
      sessionToken: 8
    }),
    getTimer: (key) => {
      assert.equal(key, 'frequent_action');
      return timer;
    },
    clearScheduledTimer: (timerId) => clearedTimers.push(timerId),
    setTimer: (key, timerId) => {
      assert.equal(key, 'frequent_action');
      timer = timerId;
    },
    clearStoredTimer: (key) => storedTimerClears.push(key),
    schedule: (callback, delayMs) => {
      assert.equal(delayMs, 10000);
      scheduledCallback = callback;
      return 'new-timer';
    },
    execute: (...args) => executions.push(args)
  });

  controller.trigger('Auto: Moved Element');

  assert.deepEqual(clearedTimers, ['old-timer']);
  assert.equal(timer, 'new-timer');
  assert.deepEqual(executions, []);

  scheduledCallback();

  assert.deepEqual(storedTimerClears, ['frequent_action']);
  assert.deepEqual(executions, [[
    'Auto: Moved Element',
    '/deck/index.html',
    8
  ]]);
});

test('auto-version controller executes structural actions immediately', () => {
  const executions = [];
  const controller = autoVersion.createStudioEditorAutoVersionController({
    shouldDebounce: () => false,
    captureSessionState: () => ({ presentationUrl: '/deck/index.html', sessionToken: 9 }),
    execute: (...args) => executions.push(args)
  });

  controller.trigger('Auto: Added Slide');

  assert.deepEqual(executions, [['Auto: Added Slide', '/deck/index.html', 9]]);
});
