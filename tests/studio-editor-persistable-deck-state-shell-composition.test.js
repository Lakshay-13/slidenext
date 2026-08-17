const test = require('node:test');
const assert = require('node:assert/strict');

const composition = require('../shared/studio-editor-persistable-deck-state-shell-composition.js');

test('persistable deck state shell composition resolves the runtime and preserves callbacks', () => {
  let receivedOptions = null;
  const runtimeOptions = {
    getDocument: () => null,
    getCaptureBuildState: () => null,
    resolveCanonicalDeck: () => null
  };
  const runtime = {
    isAvailable: true,
    persistableDeckStateAction: () => ({})
  };
  const accessorsApi = {
    createStudioEditorPersistableDeckStateRuntimeAccessors(options) {
      receivedOptions = options;
      return { runtime };
    }
  };
  const runtimeApi = { name: 'persistable-state-shell-runtime' };

  const result = composition.createStudioEditorPersistableDeckStateShellComposition({
    accessorsApi,
    runtimeApi,
    runtimeOptions
  });

  assert.equal(result.accessors.runtime, runtime);
  assert.equal(result.runtime, runtime);
  assert.equal(receivedOptions.runtimeApi, runtimeApi);
  assert.equal(receivedOptions.runtimeOptions, runtimeOptions);
});

test('persistable deck state shell composition fails closed when accessors are unavailable', () => {
  assert.deepEqual(
    composition.createStudioEditorPersistableDeckStateShellComposition({ accessorsApi: null }),
    { accessors: null, runtime: null }
  );
});
