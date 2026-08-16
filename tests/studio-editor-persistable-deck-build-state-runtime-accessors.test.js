const test = require('node:test');
const assert = require('node:assert/strict');

const accessors = require('../shared/studio-editor-persistable-deck-build-state-runtime-accessors.js');

test('persistable deck build-state runtime accessors delegate shell construction and preserve runtime options', () => {
  let receivedOptions = null;
  const runtimeValue = { isAvailable: true, persistableDeckBuildStateAction: () => ({}) };
  const runtimeApi = {
    createStudioEditorPersistableDeckBuildStateShellRuntime(options) {
      receivedOptions = options;
      return runtimeValue;
    }
  };
  const runtimeOptions = {
    getDocument: () => null,
    buildPersistableDeckHtml: () => '<html></html>'
  };

  const result = accessors.createStudioEditorPersistableDeckBuildStateRuntimeAccessors({
    runtimeApi,
    runtimeOptions
  });

  assert.deepEqual(result, { runtime: runtimeValue });
  assert.equal(receivedOptions, runtimeOptions);
});

test('persistable deck build-state runtime accessors fail closed without a shell factory', () => {
  assert.deepEqual(
    accessors.createStudioEditorPersistableDeckBuildStateRuntimeAccessors({ runtimeApi: {} }),
    { runtime: null }
  );
  assert.deepEqual(
    accessors.createStudioEditorPersistableDeckBuildStateRuntimeAccessors({ runtimeApi: null }),
    { runtime: null }
  );
});
