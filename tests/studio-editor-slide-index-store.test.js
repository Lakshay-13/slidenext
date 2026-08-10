const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const slideIndexStoreApi = require('../shared/studio-editor-slide-index-store.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');
const SLIDE_INDEX_STORE_PATH = path.join(__dirname, '..', 'shared', 'studio-editor-slide-index-store.js');

test('slide index store delegates the active slide index and preserves its initial value', () => {
  let currentIndex = 3;
  const store = slideIndexStoreApi.createStudioEditorSlideIndexStore({
    stateController: {
      getSlideIndex: () => currentIndex,
      setSlideIndex: (value) => {
        currentIndex = value;
        return currentIndex;
      }
    }
  });

  assert.equal(store.getSlideIndex(), 3);
  assert.equal(store.setSlideIndex(7), 7);
  assert.equal(store.getSlideIndex(), 7);
});

test('slide index store keeps safe fallbacks when the controller is unavailable', () => {
  const store = slideIndexStoreApi.createStudioEditorSlideIndexStore({});

  assert.equal(store.getSlideIndex(), 0);
  assert.equal(store.setSlideIndex(4), false);
});

test('slide index store publishes the global consumed by the editor shell', () => {
  const context = { globalThis: {} };
  vm.runInNewContext(fs.readFileSync(SLIDE_INDEX_STORE_PATH, 'utf8'), context);

  assert.equal(typeof context.globalThis.SlideNextStudioEditorSlideIndexStore, 'object');
  assert.equal(
    typeof context.globalThis.SlideNextStudioEditorSlideIndexStore.createStudioEditorSlideIndexStore,
    'function'
  );
});

test('editor routes active slide index access through the shared composition adapter', () => {
  const source = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(source, /studio-editor-slide-index-store\.js/);
  assert.match(source, /studioEditorStateBridge/);
  assert.doesNotMatch(source, /const studioEditorSlideIndexController =/);
});
