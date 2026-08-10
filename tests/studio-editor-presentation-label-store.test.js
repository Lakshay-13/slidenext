const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const labelStoreApi = require('../shared/studio-editor-presentation-label-store.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');
const LABEL_STORE_PATH = path.join(__dirname, '..', 'shared', 'studio-editor-presentation-label-store.js');

test('presentation label store delegates title and category state', () => {
  let title = 'Project Onboarding';
  let category = 'General';
  const store = labelStoreApi.createStudioEditorPresentationLabelStateStore({
    stateController: {
      getTitle: () => title,
      setTitle: (value) => {
        title = value;
        return title;
      },
      getCategory: () => category,
      setCategory: (value) => {
        category = value;
        return category;
      }
    }
  });

  assert.equal(store.getTitle(), 'Project Onboarding');
  assert.equal(store.getCategory(), 'General');
  assert.equal(store.setTitle('AI Tools'), 'AI Tools');
  assert.equal(store.setCategory('Research'), 'Research');
  assert.equal(store.getTitle(), 'AI Tools');
  assert.equal(store.getCategory(), 'Research');
});

test('presentation label store keeps safe fallbacks when the controller is unavailable', () => {
  const store = labelStoreApi.createStudioEditorPresentationLabelStateStore({});

  assert.equal(store.getTitle(), '');
  assert.equal(store.getCategory(), '');
  assert.equal(store.setTitle('ignored'), false);
  assert.equal(store.setCategory('ignored'), false);
});

test('presentation label store publishes the global consumed by the editor shell', () => {
  const context = { globalThis: {} };
  vm.runInNewContext(fs.readFileSync(LABEL_STORE_PATH, 'utf8'), context);

  assert.equal(typeof context.globalThis.SlideNextStudioEditorPresentationLabelStateStore, 'object');
  assert.equal(
    typeof context.globalThis.SlideNextStudioEditorPresentationLabelStateStore
      .createStudioEditorPresentationLabelStateStore,
    'function'
  );
});

test('editor routes presentation labels through the shared composition adapter', () => {
  const source = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(source, /studio-editor-presentation-label-store\.js/);
  assert.match(source, /studioEditorStateBridge/);
  assert.doesNotMatch(source, /const studioEditorPresentationLabelStateController =/);
});
