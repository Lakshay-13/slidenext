const test = require('node:test');
const assert = require('node:assert/strict');

const accessors = require('../shared/studio-editor-layer-order-z-index-runtime-accessors.js');

test('layer-order z-index runtime accessors delegate shell construction and preserve runtime options', () => {
  let receivedOptions = null;
  const runtimeValue = { isAvailable: true, sync() {} };
  const runtimeApi = {
    createStudioEditorLayerOrderZIndexShellRuntime(options) {
      receivedOptions = options;
      return runtimeValue;
    }
  };
  const runtimeOptions = {
    layerOrderApi: { createStudioLayerOrderZIndexInputSynchronizer() {} },
    getDocument: () => null,
    getDocumentRef: () => null,
    resolveCanonicalDeck: () => null,
    resolveCanonicalNode: () => null
  };

  const result = accessors.createStudioEditorLayerOrderZIndexRuntimeAccessors({
    runtimeApi,
    runtimeOptions
  });

  assert.deepEqual(result, { runtime: runtimeValue });
  assert.equal(receivedOptions, runtimeOptions);
});

test('layer-order z-index runtime accessors fail closed without a shell factory', () => {
  assert.deepEqual(
    accessors.createStudioEditorLayerOrderZIndexRuntimeAccessors({ runtimeApi: {} }),
    { runtime: null }
  );
  assert.deepEqual(
    accessors.createStudioEditorLayerOrderZIndexRuntimeAccessors({ runtimeApi: null }),
    { runtime: null }
  );
});
