const test = require('node:test');
const assert = require('node:assert/strict');

const composition = require('../shared/studio-editor-asset-insertion-shell-composition.js');

test('asset insertion shell composition resolves dependencies and exposes an available controller', () => {
  let receivedOptions = null;
  const controller = { insert() {} };
  const runtime = { isAvailable: true, assetInsertionController: controller };
  const accessorsApi = {
    createStudioEditorAssetInsertionRuntimeAccessors(options) {
      receivedOptions = options;
      return { runtime };
    }
  };
  const runtimeApi = { name: 'shell-runtime' };
  const assetInsertionApi = { name: 'asset-insertion' };
  const canonicalDeckApi = { name: 'canonical-deck' };
  const insertionController = { name: 'element-insertion' };
  const getDocument = () => null;

  const result = composition.createStudioEditorAssetInsertionShellComposition({
    accessorsApi,
    runtimeApi,
    assetInsertionApi,
    canonicalDeckApi,
    runtimeOptions: {
      getDocument,
      insertionController
    }
  });

  assert.equal(result.accessors.runtime, runtime);
  assert.equal(result.runtime, runtime);
  assert.equal(result.controller, controller);
  assert.equal(receivedOptions.runtimeApi, runtimeApi);
  assert.equal(receivedOptions.assetInsertionApi, assetInsertionApi);
  assert.equal(receivedOptions.runtimeOptions.canonicalDeckApi, canonicalDeckApi);
  assert.equal(receivedOptions.runtimeOptions.getDocument, getDocument);
  assert.equal(receivedOptions.runtimeOptions.insertionController, insertionController);
});

test('asset insertion shell composition fails closed when the runtime is unavailable', () => {
  const accessorsApi = {
    createStudioEditorAssetInsertionRuntimeAccessors() {
      return { runtime: { isAvailable: false, assetInsertionController: null } };
    }
  };

  const result = composition.createStudioEditorAssetInsertionShellComposition({ accessorsApi });

  assert.equal(result.runtime.isAvailable, false);
  assert.equal(result.controller, null);
});

test('asset insertion shell composition fails closed when accessors are unavailable', () => {
  assert.deepEqual(
    composition.createStudioEditorAssetInsertionShellComposition({ accessorsApi: null }),
    { accessors: null, runtime: null, controller: null }
  );
});
