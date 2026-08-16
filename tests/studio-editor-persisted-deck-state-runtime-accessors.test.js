const test = require('node:test');
const assert = require('node:assert/strict');

const accessors = require('../shared/studio-editor-persisted-deck-state-runtime-accessors.js');

test('persisted deck state runtime accessors delegate shell construction and preserve runtime options', () => {
  let receivedOptions = null;
  const runtimeValue = { isAvailable: true, persistedDeckStateAction: () => ({}) };
  const runtimeApi = {
    createStudioEditorPersistedDeckStateShellRuntime(options) {
      receivedOptions = options;
      return runtimeValue;
    }
  };
  const runtimeOptions = {
    getPersistenceController: () => null,
    resolveCanonicalDeck: () => null,
    setPersistedPlaybackState: () => {}
  };

  const result = accessors.createStudioEditorPersistedDeckStateRuntimeAccessors({
    runtimeApi,
    runtimeOptions
  });

  assert.deepEqual(result, { runtime: runtimeValue });
  assert.equal(receivedOptions, runtimeOptions);
});

test('persisted deck state runtime accessors fail closed without a shell factory', () => {
  assert.deepEqual(
    accessors.createStudioEditorPersistedDeckStateRuntimeAccessors({ runtimeApi: {} }),
    { runtime: null }
  );
  assert.deepEqual(
    accessors.createStudioEditorPersistedDeckStateRuntimeAccessors({ runtimeApi: null }),
    { runtime: null }
  );
});
