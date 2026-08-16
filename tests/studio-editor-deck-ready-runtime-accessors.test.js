const test = require('node:test');
const assert = require('node:assert/strict');

const accessors = require('../shared/studio-editor-deck-ready-runtime-accessors.js');

test('deck-ready runtime accessors delegate shell construction and preserve runtime options', () => {
  let receivedOptions = null;
  const runtimeValue = { deckReadyController: { name: 'deck-ready' } };
  const runtimeApi = {
    createStudioEditorDeckReadyShellRuntime(options) {
      receivedOptions = options;
      return runtimeValue;
    }
  };
  const deckReadyRuntimeApi = { name: 'deck-ready-runtime' };
  const runtimeOptions = {
    controllerApi: { name: 'controller' },
    getSaveButtonState: () => 'idle'
  };

  const result = accessors.createStudioEditorDeckReadyRuntimeAccessors({
    runtimeApi,
    deckReadyRuntimeApi,
    runtimeOptions
  });

  assert.deepEqual(result, { runtime: runtimeValue });
  assert.deepEqual(receivedOptions, {
    ...runtimeOptions,
    deckReadyRuntimeApi
  });
});

test('deck-ready runtime accessors fail closed without a shell factory', () => {
  assert.deepEqual(
    accessors.createStudioEditorDeckReadyRuntimeAccessors({ runtimeApi: {} }),
    { runtime: null }
  );
  assert.deepEqual(
    accessors.createStudioEditorDeckReadyRuntimeAccessors({ runtimeApi: null }),
    { runtime: null }
  );
});
