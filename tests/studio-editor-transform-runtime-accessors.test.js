const test = require('node:test');
const assert = require('node:assert/strict');

const accessors = require('../shared/studio-editor-transform-runtime-accessors.js');

test('transform runtime accessors delegate shell construction and preserve runtime options', () => {
  let receivedOptions = null;
  const runtimeValue = { transformController: { name: 'transform' } };
  const runtimeApi = {
    createStudioEditorTransformShellRuntime(options) {
      receivedOptions = options;
      return runtimeValue;
    }
  };
  const transformRuntimeApi = { name: 'transform-runtime' };
  const runtimeOptions = {
    getActiveSlide: () => null,
    snapDistancePx: 12
  };

  const result = accessors.createStudioEditorTransformRuntimeAccessors({
    runtimeApi,
    transformRuntimeApi,
    runtimeOptions
  });

  assert.deepEqual(result, { runtime: runtimeValue });
  assert.deepEqual(receivedOptions, {
    ...runtimeOptions,
    transformRuntimeApi
  });
});

test('transform runtime accessors fail closed without a shell factory', () => {
  assert.deepEqual(
    accessors.createStudioEditorTransformRuntimeAccessors({ runtimeApi: {} }),
    { runtime: null }
  );
  assert.deepEqual(
    accessors.createStudioEditorTransformRuntimeAccessors({ runtimeApi: null }),
    { runtime: null }
  );
});
