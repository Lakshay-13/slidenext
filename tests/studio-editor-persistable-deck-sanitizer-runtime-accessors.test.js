const test = require('node:test');
const assert = require('node:assert/strict');

const accessors = require('../shared/studio-editor-persistable-deck-sanitizer-runtime-accessors.js');

test('persistable deck sanitizer runtime accessors delegate shell construction and preserve runtime options', () => {
  let receivedOptions = null;
  const runtimeValue = { isAvailable: true, persistableDeckSanitizerAction: () => ({}) };
  const runtimeApi = {
    createStudioEditorPersistableDeckSanitizerShellRuntime(options) {
      receivedOptions = options;
      return runtimeValue;
    }
  };
  const runtimeOptions = {
    getPersistenceController: () => null,
    getDeckSanitizerOptions: () => ({})
  };

  const result = accessors.createStudioEditorPersistableDeckSanitizerRuntimeAccessors({
    runtimeApi,
    runtimeOptions
  });

  assert.deepEqual(result, { runtime: runtimeValue });
  assert.equal(receivedOptions, runtimeOptions);
});

test('persistable deck sanitizer runtime accessors fail closed without a shell factory', () => {
  assert.deepEqual(
    accessors.createStudioEditorPersistableDeckSanitizerRuntimeAccessors({ runtimeApi: {} }),
    { runtime: null }
  );
  assert.deepEqual(
    accessors.createStudioEditorPersistableDeckSanitizerRuntimeAccessors({ runtimeApi: null }),
    { runtime: null }
  );
});
