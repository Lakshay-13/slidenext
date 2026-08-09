const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const saveButtonStoreApi = require('../shared/studio-editor-save-button-state-store.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');
const STORE_PATH = path.join(__dirname, '..', 'shared', 'studio-editor-save-button-state-store.js');

test('save button state store delegates normalized version-save state', () => {
  let state = 'saving-version';
  const store = saveButtonStoreApi.createStudioEditorSaveButtonStateStore({
    stateController: {
      getState: () => state,
      setState: (value) => {
        state = value === 'saving-version' ? value : 'idle';
        return state;
      },
      reset: () => {
        state = 'idle';
        return state;
      }
    }
  });

  assert.equal(store.getState(), 'saving-version');
  assert.equal(store.setState('unexpected'), 'idle');
  assert.equal(store.setState('saving-version'), 'saving-version');
  assert.equal(store.reset(), 'idle');
});

test('save button state store keeps safe fallbacks when the controller is unavailable', () => {
  const store = saveButtonStoreApi.createStudioEditorSaveButtonStateStore({});

  assert.equal(store.getState(), 'idle');
  assert.equal(store.setState('saving-version'), false);
  assert.equal(store.reset(), false);
});

test('save button state store publishes the global consumed by the editor shell', () => {
  const context = { globalThis: {} };
  vm.runInNewContext(fs.readFileSync(STORE_PATH, 'utf8'), context);

  assert.equal(typeof context.globalThis.SlideNextStudioEditorSaveButtonStateStore, 'object');
  assert.equal(
    typeof context.globalThis.SlideNextStudioEditorSaveButtonStateStore
      .createStudioEditorSaveButtonStateStore,
    'function'
  );
});

test('editor routes save button state through the shared composition adapter', () => {
  const source = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(source, /studio-editor-save-button-state-store\.js/);
  assert.match(source, /studioEditorSaveButtonStateStore/);
  assert.doesNotMatch(source, /const studioEditorSaveButtonStateController =/);
});
