const test = require('node:test');
const assert = require('node:assert/strict');

const accessors = require('../shared/studio-editor-metadata-persistence-runtime-accessors.js');

test('metadata persistence runtime accessors delegate shell construction and preserve runtime options', () => {
  let receivedOptions = null;
  const runtimeValue = { isAvailable: true, metadataPersistenceAction: () => ({}) };
  const runtimeApi = {
    createStudioEditorMetadataPersistenceShellRuntime(options) {
      receivedOptions = options;
      return runtimeValue;
    }
  };
  const runtimeOptions = {
    getCurrentPresentationMetadata: () => ({ id: 'deck-1' }),
    mergePresentationPersistenceOptions: () => ({})
  };

  const result = accessors.createStudioEditorMetadataPersistenceRuntimeAccessors({
    runtimeApi,
    runtimeOptions
  });

  assert.deepEqual(result, { runtime: runtimeValue });
  assert.equal(receivedOptions, runtimeOptions);
});

test('metadata persistence runtime accessors fail closed without a shell factory', () => {
  assert.deepEqual(
    accessors.createStudioEditorMetadataPersistenceRuntimeAccessors({ runtimeApi: {} }),
    { runtime: null }
  );
  assert.deepEqual(
    accessors.createStudioEditorMetadataPersistenceRuntimeAccessors({ runtimeApi: null }),
    { runtime: null }
  );
});
