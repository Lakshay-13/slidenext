const test = require('node:test');
const assert = require('node:assert/strict');

const accessors = require('../shared/studio-editor-canvas-runtime-accessors.js');

test('canvas runtime accessors delegate shell construction and preserve runtime options', () => {
  let receivedOptions = null;
  const runtimeValue = { sync: () => ({ didApply: true }) };
  const runtimeApi = {
    createStudioEditorCanvasShellRuntime(options) {
      receivedOptions = options;
      return runtimeValue;
    }
  };
  const runtimeOptions = {
    getDocumentRef: () => null,
    getCanonicalDeck: () => null,
    getZoomFactor: () => 1
  };

  const result = accessors.createStudioEditorCanvasRuntimeAccessors({
    runtimeApi,
    runtimeOptions
  });

  assert.deepEqual(result, { runtime: runtimeValue });
  assert.equal(receivedOptions, runtimeOptions);
});

test('canvas runtime accessors fail closed without a shell factory', () => {
  assert.deepEqual(
    accessors.createStudioEditorCanvasRuntimeAccessors({ runtimeApi: {} }),
    { runtime: null }
  );
  assert.deepEqual(
    accessors.createStudioEditorCanvasRuntimeAccessors({ runtimeApi: null }),
    { runtime: null }
  );
});
