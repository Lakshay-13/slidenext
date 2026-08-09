const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const renameStoreApi = require('../shared/studio-editor-version-rename-state-store.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');
const STORE_PATH = path.join(__dirname, '..', 'shared', 'studio-editor-version-rename-state-store.js');

test('version rename state store delegates filename and context state', () => {
  let state = {
    filename: 'draft.html',
    context: { presentationUrl: '/presentations/demo/index.html' }
  };
  const store = renameStoreApi.createStudioEditorVersionRenameStateStore({
    stateController: {
      getState: () => state,
      setState: (value) => {
        state = value;
        return state;
      },
      clear: () => {
        state = { filename: '', context: null };
        return state;
      }
    }
  });

  assert.deepEqual(store.getState(), state);
  assert.deepEqual(store.setState({ filename: 'renamed.html', context: null }), {
    filename: 'renamed.html',
    context: null
  });
  assert.deepEqual(store.clear(), { filename: '', context: null });
});

test('version rename state store keeps safe fallbacks when the controller is unavailable', () => {
  const store = renameStoreApi.createStudioEditorVersionRenameStateStore({});

  assert.deepEqual(store.getState(), { filename: '', context: null });
  assert.equal(store.setState({ filename: 'ignored.html' }), false);
  assert.equal(store.clear(), false);
});

test('version rename state store publishes the global consumed by the editor shell', () => {
  const context = { globalThis: {} };
  vm.runInNewContext(fs.readFileSync(STORE_PATH, 'utf8'), context);

  assert.equal(typeof context.globalThis.SlideNextStudioEditorVersionRenameStateStore, 'object');
  assert.equal(
    typeof context.globalThis.SlideNextStudioEditorVersionRenameStateStore
      .createStudioEditorVersionRenameStateStore,
    'function'
  );
});

test('editor routes version rename state through the shared composition adapter', () => {
  const source = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(source, /studio-editor-version-rename-state-store\.js/);
  assert.match(source, /studioEditorVersionRenameStateStore/);
  assert.doesNotMatch(source, /const studioEditorVersionRenameStateController =/);
});
