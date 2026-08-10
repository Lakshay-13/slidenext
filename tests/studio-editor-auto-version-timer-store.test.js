const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const timerStoreApi = require('../shared/studio-editor-auto-version-timer-store.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');
const TIMER_STORE_PATH = path.join(__dirname, '..', 'shared', 'studio-editor-auto-version-timer-store.js');

test('auto-version timer store delegates keyed timer ownership', () => {
  let timers = { autosave: 11 };
  const store = timerStoreApi.createStudioEditorAutoVersionTimerStore({
    stateController: {
      getTimers: () => timers,
      setTimers: (value) => {
        timers = value;
        return timers;
      },
      getTimer: (key) => timers[key],
      setTimer: (key, value) => {
        timers[key] = value;
        return value;
      },
      clearTimer: (key) => {
        const value = timers[key];
        delete timers[key];
        return value;
      }
    }
  });

  assert.deepEqual(store.getTimers(), { autosave: 11 });
  assert.equal(store.setTimer('version', 22), 22);
  assert.equal(store.getTimer('version'), 22);
  assert.equal(store.clearTimer('autosave'), 11);
  assert.deepEqual(store.getTimers(), { version: 22 });
});

test('auto-version timer store keeps safe fallbacks when the controller is unavailable', () => {
  const store = timerStoreApi.createStudioEditorAutoVersionTimerStore({});

  assert.deepEqual(store.getTimers(), {});
  assert.equal(store.getTimer('version'), undefined);
  assert.equal(store.setTimers({ version: 22 }), false);
  assert.equal(store.setTimer('version', 22), false);
  assert.equal(store.clearTimer('version'), undefined);
});

test('auto-version timer store publishes the global consumed by the editor shell', () => {
  const context = { globalThis: {} };
  vm.runInNewContext(fs.readFileSync(TIMER_STORE_PATH, 'utf8'), context);

  assert.equal(typeof context.globalThis.SlideNextStudioEditorAutoVersionTimerStore, 'object');
  assert.equal(
    typeof context.globalThis.SlideNextStudioEditorAutoVersionTimerStore
      .createStudioEditorAutoVersionTimerStore,
    'function'
  );
});

test('editor routes auto-version timer ownership through the shared composition adapter', () => {
  const source = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(source, /studio-editor-auto-version-timer-store\.js/);
  assert.match(source, /studioEditorTimerStateBridge/);
  assert.doesNotMatch(source, /const studioEditorAutoVersionTimerController =/);
});
