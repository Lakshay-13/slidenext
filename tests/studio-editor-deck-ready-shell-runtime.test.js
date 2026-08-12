const test = require('node:test');
const assert = require('node:assert/strict');

const shellRuntime = require('../shared/studio-editor-deck-ready-shell-runtime.js');

test('deck-ready shell runtime delegates the prepared readiness options', () => {
  let receivedOptions = null;
  const runtimeOptions = { getSaveButtonState: () => 'idle' };
  const deckReadyRuntimeApi = {
    createStudioEditorDeckReadyRuntime(options) {
      receivedOptions = options;
      return { name: 'deck-ready-runtime' };
    }
  };

  assert.deepEqual(
    shellRuntime.createStudioEditorDeckReadyShellRuntime({
      deckReadyRuntimeApi,
      runtimeOptions
    }),
    { name: 'deck-ready-runtime' }
  );
  assert.equal(receivedOptions, runtimeOptions);
});

test('deck-ready shell runtime safely handles missing runtime factories', () => {
  assert.equal(shellRuntime.createStudioEditorDeckReadyShellRuntime({}), null);
  assert.equal(
    shellRuntime.createStudioEditorDeckReadyShellRuntime({ deckReadyRuntimeApi: {} }),
    null
  );
});
