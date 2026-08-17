const test = require('node:test');
const assert = require('node:assert/strict');

const composition = require('../shared/studio-editor-persisted-deck-state-shell-composition.js');

test('persisted deck state shell composition resolves the runtime and preserves options', () => {
  let receivedOptions = null;
  const runtimeOptions = {
    getPersistenceController: () => null,
    resolveCanonicalDeck: () => null,
    normalizePlaybackState: () => null
  };
  const runtime = {
    isAvailable: true,
    persistedDeckStateAction: () => ({})
  };
  const accessorsApi = {
    createStudioEditorPersistedDeckStateRuntimeAccessors(options) {
      receivedOptions = options;
      return { runtime };
    }
  };
  const runtimeApi = { name: 'persisted-deck-state-shell-runtime' };

  const result = composition.createStudioEditorPersistedDeckStateShellComposition({
    accessorsApi,
    runtimeApi,
    runtimeOptions
  });

  assert.equal(result.accessors.runtime, runtime);
  assert.equal(result.runtime, runtime);
  assert.equal(receivedOptions.runtimeApi, runtimeApi);
  assert.equal(receivedOptions.runtimeOptions, runtimeOptions);
});

test('persisted deck state shell composition fails closed when accessors are unavailable', () => {
  assert.deepEqual(
    composition.createStudioEditorPersistedDeckStateShellComposition({ accessorsApi: null }),
    { accessors: null, runtime: null }
  );
});
