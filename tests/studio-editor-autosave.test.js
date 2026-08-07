const test = require('node:test');
const assert = require('node:assert/strict');
const editorAutoSave = require('../shared/studio-editor-autosave.js');

test('createStudioEditorAutoSaveAdapter debounces and executes the persistence callback', async () => {
  let scheduledCallback = null;
  let timer = 'old-timer';
  const statuses = [];
  let executeCalls = 0;
  const persistenceState = {
    persistencePlan: {
      hasPersistedCurrentState: false,
      persistenceContext: { presentationUrl: '/deck/index.html' }
    }
  };
  const adapter = editorAutoSave.createStudioEditorAutoSaveAdapter({
    persistenceApi: {
      resolveStudioAutoSavePersistenceStateFromCapture() {},
      async executeStudioAutoSavePersistenceRequestWithHandlers(state, options) {
        executeCalls += 1;
        assert.equal(state, persistenceState);
        options.successOptions.onSuccess();
      }
    },
    captureSessionState() {
      return { presentationUrl: '/deck/index.html', sessionToken: 4 };
    },
    setStatus(status) {
      statuses.push(status);
    },
    getTimer() {
      return timer;
    },
    clearTimer(nextTimer) {
      assert.equal(nextTimer, 'old-timer');
    },
    setTimer(nextTimer) {
      timer = nextTimer;
    },
    schedule(callback) {
      scheduledCallback = callback;
      return 'new-timer';
    },
    isTaskStale() {
      return false;
    },
    resolvePersistenceState() {
      return persistenceState;
    }
  });

  adapter();
  assert.deepEqual(statuses, ['saving']);
  assert.equal(timer, 'new-timer');
  await scheduledCallback();
  assert.equal(executeCalls, 1);
  assert.deepEqual(statuses, ['saving', 'saved']);
  assert.equal(timer, null);
});

test('createStudioEditorAutoSaveAdapter skips stale sessions without persistence work', async () => {
  let scheduledCallback = null;
  let executeCalls = 0;
  const statuses = [];
  const adapter = editorAutoSave.createStudioEditorAutoSaveAdapter({
    persistenceApi: {
      async executeStudioAutoSavePersistenceRequestWithHandlers() {
        executeCalls += 1;
      }
    },
    setStatus(status) {
      statuses.push(status);
    },
    schedule(callback) {
      scheduledCallback = callback;
      return 'timer';
    },
    isTaskStale() {
      return true;
    }
  });

  adapter();
  await scheduledCallback();
  assert.equal(executeCalls, 0);
  assert.deepEqual(statuses, ['saving']);
});
