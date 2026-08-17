const test = require('node:test');
const assert = require('node:assert/strict');

const composition = require('../shared/studio-editor-inspector-selection-composition.js');

test('inspector selection composition builds and exposes the shared synchronizer', () => {
  const documentRef = { id: 'document-1' };
  const calls = [];
  const runtimeApi = { id: 'runtime' };
  const inspectorApi = { id: 'inspector' };
  const compositionResult = composition.createStudioEditorInspectorSelectionComposition({
    accessorsApi: {
      createStudioEditorInspectorSelectionAccessors(options) {
        calls.push(options);
        return {
          sync(doc) {
            return doc === documentRef ? 'synced' : false;
          }
        };
      }
    },
    runtimeApi,
    inspectorApi,
    documentRef
  });

  assert.equal(compositionResult.sync(documentRef), 'synced');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].runtimeApi, runtimeApi);
  assert.equal(calls[0].inspectorApi, inspectorApi);
  assert.equal(calls[0].documentRef, documentRef);
  assert.equal(compositionResult.accessors.sync, compositionResult.synchronizer);
});

test('inspector selection composition fails closed when accessors are unavailable', () => {
  const compositionResult = composition.createStudioEditorInspectorSelectionComposition({
    accessorsApi: null
  });

  assert.equal(compositionResult.accessors, null);
  assert.equal(compositionResult.synchronizer, null);
  assert.equal(compositionResult.sync({}), false);
});
