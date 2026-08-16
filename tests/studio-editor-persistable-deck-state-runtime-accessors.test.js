const test = require('node:test');
const assert = require('node:assert/strict');

const accessors = require('../shared/studio-editor-persistable-deck-state-runtime-accessors.js');

test('persistable deck state runtime accessors delegate shell construction and preserve runtime options', () => {
  let receivedOptions = null;
  const runtimeValue = { isAvailable: true, persistableDeckStateAction: () => ({}) };
  const runtimeApi = {
    createStudioEditorPersistableDeckStateShellRuntime(options) {
      receivedOptions = options;
      return runtimeValue;
    }
  };
  const runtimeOptions = {
    getDocument: () => null,
    getCaptureBuildState: () => null,
    resolveCanonicalDeck: () => null
  };

  const result = accessors.createStudioEditorPersistableDeckStateRuntimeAccessors({
    runtimeApi,
    runtimeOptions
  });

  assert.deepEqual(result, { runtime: runtimeValue });
  assert.equal(receivedOptions, runtimeOptions);
});

test('persistable deck state runtime accessors fail closed without a shell factory', () => {
  assert.deepEqual(
    accessors.createStudioEditorPersistableDeckStateRuntimeAccessors({ runtimeApi: {} }),
    { runtime: null }
  );
  assert.deepEqual(
    accessors.createStudioEditorPersistableDeckStateRuntimeAccessors({ runtimeApi: null }),
    { runtime: null }
  );
});
