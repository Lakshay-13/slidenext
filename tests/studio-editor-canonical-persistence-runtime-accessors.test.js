const test = require('node:test');
const assert = require('node:assert/strict');

const accessors = require('../shared/studio-editor-canonical-persistence-runtime-accessors.js');

test('canonical persistence runtime accessors delegate shell construction and preserve runtime options', () => {
  let receivedOptions = null;
  const runtimeValue = { isAvailable: true, canonicalPersistenceAdapter: { name: 'adapter' } };
  const runtimeApi = {
    createStudioEditorCanonicalPersistenceShellRuntime(options) {
      receivedOptions = options;
      return runtimeValue;
    }
  };
  const runtimeOptions = {
    getPersistenceController: () => null,
    isCanonicalDeck: () => true
  };

  const result = accessors.createStudioEditorCanonicalPersistenceRuntimeAccessors({
    runtimeApi,
    runtimeOptions
  });

  assert.deepEqual(result, { runtime: runtimeValue });
  assert.equal(receivedOptions, runtimeOptions);
});

test('canonical persistence runtime accessors fail closed without a shell factory', () => {
  assert.deepEqual(
    accessors.createStudioEditorCanonicalPersistenceRuntimeAccessors({ runtimeApi: {} }),
    { runtime: null }
  );
  assert.deepEqual(
    accessors.createStudioEditorCanonicalPersistenceRuntimeAccessors({ runtimeApi: null }),
    { runtime: null }
  );
});
