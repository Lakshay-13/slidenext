const test = require('node:test');
const assert = require('node:assert/strict');

const composition = require('../shared/studio-editor-metadata-persistence-shell-composition.js');

test('metadata persistence shell composition resolves the runtime and preserves options', () => {
  let receivedOptions = null;
  const runtimeOptions = {
    getPersistenceController: () => null,
    getCurrentPresentationMetadata: () => ({})
  };
  const runtime = {
    isAvailable: true,
    metadataPersistenceAction: () => ({})
  };
  const accessorsApi = {
    createStudioEditorMetadataPersistenceRuntimeAccessors(options) {
      receivedOptions = options;
      return { runtime };
    }
  };
  const runtimeApi = { name: 'metadata-persistence-shell-runtime' };

  const result = composition.createStudioEditorMetadataPersistenceShellComposition({
    accessorsApi,
    runtimeApi,
    runtimeOptions
  });

  assert.equal(result.accessors.runtime, runtime);
  assert.equal(result.runtime, runtime);
  assert.equal(receivedOptions.runtimeApi, runtimeApi);
  assert.equal(receivedOptions.runtimeOptions, runtimeOptions);
});

test('metadata persistence shell composition fails closed when accessors are unavailable', () => {
  assert.deepEqual(
    composition.createStudioEditorMetadataPersistenceShellComposition({ accessorsApi: null }),
    { accessors: null, runtime: null }
  );
});
