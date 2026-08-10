const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const selectionStoreApi = require('../shared/studio-editor-selection-store.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');
const SELECTION_STORE_PATH = path.join(__dirname, '..', 'shared', 'studio-editor-selection-store.js');

test('selection store delegates state without changing element references', () => {
  const firstElement = { id: 'node-1' };
  const secondElement = { id: 'node-2' };
  const controller = {
    getState: () => ({ selectedElements: [firstElement], selectedElement: firstElement }),
    getSelectedElements: () => [firstElement],
    getSelectedElement: () => firstElement,
    getPreserveSelectionOnNextActiveSlideSync: () => true,
    setPreserveSelectionOnNextActiveSlideSync: (value) => !!value,
    setState: (value) => value,
    clear: () => ({ selectedElements: [], selectedElement: null })
  };
  const store = selectionStoreApi.createStudioEditorSelectionStateStore({
    stateController: controller
  });

  assert.equal(store.getSelectedElements()[0], firstElement);
  assert.equal(store.getSelectedElement(), firstElement);
  assert.equal(store.getPreserveSelectionOnNextActiveSlideSync(), true);
  assert.deepEqual(store.setState({ selectedElements: [secondElement] }), {
    selectedElements: [secondElement]
  });
  assert.equal(store.setPreserveSelectionOnNextActiveSlideSync(false), false);
  assert.deepEqual(store.clear(), { selectedElements: [], selectedElement: null });
});

test('selection store keeps safe fallbacks when the controller is unavailable', () => {
  const store = selectionStoreApi.createStudioEditorSelectionStateStore({});

  assert.deepEqual(store.getState(), { selectedElements: [], selectedElement: null });
  assert.deepEqual(store.getSelectedElements(), []);
  assert.equal(store.getSelectedElement(), null);
  assert.equal(store.getPreserveSelectionOnNextActiveSlideSync(), false);
  assert.equal(store.setState({}), false);
  assert.equal(store.clear(), false);
});

test('selection store publishes the global consumed by the editor shell', () => {
  const context = { globalThis: {} };
  vm.runInNewContext(fs.readFileSync(SELECTION_STORE_PATH, 'utf8'), context);

  assert.equal(typeof context.globalThis.SlideNextStudioEditorSelectionStateStore, 'object');
  assert.equal(
    typeof context.globalThis.SlideNextStudioEditorSelectionStateStore.createStudioEditorSelectionStateStore,
    'function'
  );
});

test('editor routes selection state access through the shared composition adapter', () => {
  const source = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(source, /studio-editor-selection-store\.js/);
  assert.match(source, /studioEditorStateBridge/);
  assert.doesNotMatch(source, /const studioEditorSelectionStateController =/);
});
