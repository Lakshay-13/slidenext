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

test('auto-version executor skips stale or already-persisted checkpoints', async () => {
  let resolveCalls = 0;
  let saveCalls = 0;
  const executor = autoVersion.createStudioEditorAutoVersionExecutor({
    persistenceApi: {
      isStudioVersionCheckpointSavePersisted() {
        return true;
      }
    },
    isTaskStale() {
      return false;
    },
    getDocument() {
      return { id: 'iframe-doc' };
    },
    resolvePersistenceState(doc, presentationUrl, sessionToken) {
      resolveCalls += 1;
      assert.deepEqual({ doc, presentationUrl, sessionToken }, {
        doc: { id: 'iframe-doc' },
        presentationUrl: '/deck/index.html',
        sessionToken: 10
      });
      return { persistenceContext: { presentationUrl } };
    },
    saveCheckpoint() {
      saveCalls += 1;
    }
  });

  const result = await executor.execute('Auto: Edited Text', '/deck/index.html', 10);

  assert.equal(result, false);
  assert.equal(resolveCalls, 1);
  assert.equal(saveCalls, 0);
});

test('auto-version executor forwards checkpoint callbacks and reports failures', async () => {
  const logCalls = [];
  const errorCalls = [];
  let saveArgs = null;
  const executor = autoVersion.createStudioEditorAutoVersionExecutor({
    persistenceApi: {
      isStudioVersionCheckpointSavePersisted() {
        return false;
      }
    },
    getDocument: () => null,
    resolvePersistenceState: () => ({
      persistenceContext: { presentationUrl: '/deck/index.html' }
    }),
    saveCheckpoint: async (...args) => {
      saveArgs = args;
      args[3].onSuccess();
      args[3].onFailure({ error: 'disk full' });
    },
    logger: {
      log(message) {
        logCalls.push(message);
      },
      error(message) {
        errorCalls.push(message);
      }
    }
  });

  await executor.execute('Auto: Edited Text', '/deck/index.html', 10);

  assert.equal(saveArgs[0], 'Auto: Edited Text');
  assert.equal(saveArgs[1].persistenceContext.presentationUrl, '/deck/index.html');
  assert.equal(saveArgs[2], '/deck/index.html');
  assert.equal(typeof saveArgs[3].onSuccess, 'function');
  assert.equal(typeof saveArgs[3].onFailure, 'function');
  assert.deepEqual(logCalls, ['Auto-created version checkpoint: Auto: Edited Text']);
  assert.deepEqual(errorCalls, ['Failed to auto-create version backup: disk full']);
});
