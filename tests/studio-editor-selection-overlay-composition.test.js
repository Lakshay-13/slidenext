const test = require('node:test');
const assert = require('node:assert/strict');

const composition = require('../shared/studio-editor-selection-overlay-composition.js');

test('selection overlay composition builds and exposes the shared synchronizer', () => {
  const documentRef = { id: 'document-1' };
  const calls = [];
  const runtimeApi = { id: 'runtime' };
  const overlayApi = { id: 'overlay' };
  const compositionResult = composition.createStudioEditorSelectionOverlayComposition({
    accessorsApi: {
      createStudioEditorSelectionOverlayAccessors(options) {
        calls.push(options);
        return {
          sync(doc) {
            return doc === documentRef ? 'synced' : false;
          }
        };
      }
    },
    runtimeApi,
    overlayApi,
    documentRef
  });

  assert.equal(compositionResult.sync(documentRef), 'synced');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].runtimeApi, runtimeApi);
  assert.equal(calls[0].overlayApi, overlayApi);
  assert.equal(calls[0].documentRef, documentRef);
  assert.equal(compositionResult.accessors.sync, compositionResult.synchronizer);
});

test('selection overlay composition fails closed when accessors are unavailable', () => {
  const compositionResult = composition.createStudioEditorSelectionOverlayComposition({
    accessorsApi: null
  });

  assert.equal(compositionResult.accessors, null);
  assert.equal(compositionResult.synchronizer, null);
  assert.equal(compositionResult.sync({}), false);
});
