const test = require('node:test');
const assert = require('node:assert/strict');

const composition = require('../shared/studio-editor-canonical-persistence-shell-composition.js');

test('canonical persistence shell composition resolves the runtime and preserves options', () => {
  let receivedOptions = null;
  const runtimeOptions = {
    getPersistenceController: () => null,
    buildCanonicalDeckForDocument: () => null
  };
  const runtime = {
    isAvailable: true,
    canonicalPersistenceAdapter: { name: 'adapter' }
  };
  const accessorsApi = {
    createStudioEditorCanonicalPersistenceRuntimeAccessors(options) {
      receivedOptions = options;
      return { runtime };
    }
  };
  const runtimeApi = { name: 'canonical-shell-runtime' };

  const result = composition.createStudioEditorCanonicalPersistenceShellComposition({
    accessorsApi,
    runtimeApi,
    runtimeOptions
  });

  assert.equal(result.accessors.runtime, runtime);
  assert.equal(result.runtime, runtime);
  assert.equal(receivedOptions.runtimeApi, runtimeApi);
  assert.equal(receivedOptions.runtimeOptions, runtimeOptions);
});

test('canonical persistence shell composition fails closed when accessors are unavailable', () => {
  assert.deepEqual(
    composition.createStudioEditorCanonicalPersistenceShellComposition({ accessorsApi: null }),
    { accessors: null, runtime: null }
  );
});
