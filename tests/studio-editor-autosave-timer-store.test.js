const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const timerStoreApi = require('../shared/studio-editor-autosave-timer-store.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');
const TIMER_STORE_PATH = path.join(__dirname, '..', 'shared', 'studio-editor-autosave-timer-store.js');

test('autosave timer store delegates debounce timer ownership', () => {
  let timer = 42;
  const store = timerStoreApi.createStudioEditorAutoSaveTimerStore({
    stateController: {
      getTimer: () => timer,
      setTimer: (value) => {
        timer = value;
        return timer;
      }
    }
  });

  assert.equal(store.getTimer(), 42);
  assert.equal(store.setTimer(84), 84);
  assert.equal(store.getTimer(), 84);
});

test('autosave timer store keeps safe fallbacks when the controller is unavailable', () => {
  const store = timerStoreApi.createStudioEditorAutoSaveTimerStore({});

  assert.equal(store.getTimer(), null);
  assert.equal(store.setTimer(84), false);
});

test('autosave timer store publishes the global consumed by the editor shell', () => {
  const context = { globalThis: {} };
  vm.runInNewContext(fs.readFileSync(TIMER_STORE_PATH, 'utf8'), context);

  assert.equal(typeof context.globalThis.SlideNextStudioEditorAutoSaveTimerStore, 'object');
  assert.equal(
    typeof context.globalThis.SlideNextStudioEditorAutoSaveTimerStore.createStudioEditorAutoSaveTimerStore,
    'function'
  );
});

test('editor routes autosave timer access through the shared composition adapter', () => {
  const source = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(source, /studio-editor-autosave-timer-store\.js/);
  assert.match(source, /studioEditorTimerStateBridge/);
  assert.doesNotMatch(source, /const studioEditorAutoSaveTimerController =/);
});
