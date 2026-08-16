const test = require('node:test');
const assert = require('node:assert/strict');

const accessors = require('../shared/studio-editor-canonical-runtime-accessors.js');

test('canonical runtime accessors delegate shell construction and preserve runtime options', () => {
  let receivedOptions = null;
  const runtimeValue = { canonicalState: { name: 'canonical' } };
  const runtimeApi = {
    createStudioEditorCanonicalShellRuntime(options) {
      receivedOptions = options;
      return runtimeValue;
    }
  };
  const canonicalRuntimeApi = { name: 'canonical-runtime' };
  const runtimeOptions = {
    getPendingCanonicalDeck: () => null,
    getDocument: () => null
  };

  const result = accessors.createStudioEditorCanonicalRuntimeAccessors({
    runtimeApi,
    canonicalRuntimeApi,
    runtimeOptions
  });

  assert.deepEqual(result, { runtime: runtimeValue });
  assert.deepEqual(receivedOptions, {
    ...runtimeOptions,
    canonicalRuntimeApi
  });
});

test('canonical runtime accessors fail closed without a shell factory', () => {
  assert.deepEqual(
    accessors.createStudioEditorCanonicalRuntimeAccessors({ runtimeApi: {} }),
    { runtime: null }
  );
  assert.deepEqual(
    accessors.createStudioEditorCanonicalRuntimeAccessors({ runtimeApi: null }),
    { runtime: null }
  );
});
