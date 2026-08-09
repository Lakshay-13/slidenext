const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const metadataStoreApi = require('../shared/studio-editor-presentation-metadata-store.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');
const METADATA_STORE_PATH = path.join(__dirname, '..', 'shared', 'studio-editor-presentation-metadata-store.js');

test('presentation metadata store delegates metadata reads and writes by reference', () => {
  const initialMetadata = { id: 'deck-1', title: 'Demo' };
  let metadata = initialMetadata;
  const store = metadataStoreApi.createStudioEditorPresentationMetadataStateStore({
    stateController: {
      getPresentationMetadata: () => metadata,
      setPresentationMetadata: (value) => {
        metadata = value || null;
        return metadata;
      }
    }
  });

  assert.equal(store.getPresentationMetadata(), initialMetadata);
  const nextMetadata = { id: 'deck-2', title: 'Updated' };
  assert.equal(store.setPresentationMetadata(nextMetadata), nextMetadata);
  assert.equal(store.getPresentationMetadata(), nextMetadata);
});

test('presentation metadata store keeps null fallbacks when the controller is unavailable', () => {
  const store = metadataStoreApi.createStudioEditorPresentationMetadataStateStore({});

  assert.equal(store.getPresentationMetadata(), null);
  assert.equal(store.setPresentationMetadata({ id: 'ignored' }), null);
});

test('presentation metadata store publishes the global consumed by the editor shell', () => {
  const context = { globalThis: {} };
  vm.runInNewContext(fs.readFileSync(METADATA_STORE_PATH, 'utf8'), context);

  assert.equal(typeof context.globalThis.SlideNextStudioEditorPresentationMetadataStateStore, 'object');
  assert.equal(
    typeof context.globalThis.SlideNextStudioEditorPresentationMetadataStateStore
      .createStudioEditorPresentationMetadataStateStore,
    'function'
  );
});

test('editor routes presentation metadata through the shared composition adapter', () => {
  const source = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(source, /studio-editor-presentation-metadata-store\.js/);
  assert.match(source, /studioEditorPresentationMetadataStateStore/);
  assert.doesNotMatch(source, /const studioEditorPresentationMetadataStateController =/);
});
