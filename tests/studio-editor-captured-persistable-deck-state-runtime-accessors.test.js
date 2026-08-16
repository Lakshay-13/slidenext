const test = require('node:test');
const assert = require('node:assert/strict');

const accessors = require('../shared/studio-editor-captured-persistable-deck-state-runtime-accessors.js');

test('captured persistable deck state runtime accessors delegate shell construction and preserve runtime options', () => {
  let receivedOptions = null;
  const runtimeValue = { isAvailable: true, capturedPersistableDeckStateAction: () => ({}) };
  const runtimeApi = {
    createStudioEditorCapturedPersistableDeckStateShellRuntime(options) {
      receivedOptions = options;
      return runtimeValue;
    }
  };
  const runtimeOptions = {
    getPersistenceController: () => null,
    persistenceStateApi: { name: 'persistence-state' }
  };

  const result = accessors.createStudioEditorCapturedPersistableDeckStateRuntimeAccessors({
    runtimeApi,
    runtimeOptions
  });

  assert.deepEqual(result, { runtime: runtimeValue });
  assert.equal(receivedOptions, runtimeOptions);
});

test('captured persistable deck state runtime accessors fail closed without a shell factory', () => {
  assert.deepEqual(
    accessors.createStudioEditorCapturedPersistableDeckStateRuntimeAccessors({ runtimeApi: {} }),
    { runtime: null }
  );
  assert.deepEqual(
    accessors.createStudioEditorCapturedPersistableDeckStateRuntimeAccessors({ runtimeApi: null }),
    { runtime: null }
  );
});
