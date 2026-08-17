const test = require('node:test');
const assert = require('node:assert/strict');

const composition = require('../shared/studio-editor-shell-state-composition.js');

test('shell-state composition resolves the runtime and preserves state dependencies', () => {
  let receivedOptions = null;
  const runtimeOptions = {
    getDocument: () => null,
    historyBridgeApi: { name: 'history' },
    persistedDeckBridgeApi: { name: 'persisted-deck' },
    timerStateAccessorsApi: { name: 'timers' }
  };
  const runtime = {
    sessionStateBridge: { name: 'session' },
    stateBridge: { name: 'state' }
  };
  const accessorsApi = {
    createStudioEditorShellStateRuntimeAccessors(options) {
      receivedOptions = options;
      return { runtime };
    }
  };
  const runtimeApi = { name: 'shell-state-runtime' };

  const result = composition.createStudioEditorShellStateComposition({
    accessorsApi,
    runtimeApi,
    runtimeOptions
  });

  assert.equal(result.accessors.runtime, runtime);
  assert.equal(result.runtime, runtime);
  assert.equal(receivedOptions.runtimeApi, runtimeApi);
  assert.equal(receivedOptions.runtimeOptions, runtimeOptions);
});

test('shell-state composition preserves the runtime-null fallback', () => {
  assert.deepEqual(
    composition.createStudioEditorShellStateComposition({ accessorsApi: null }),
    { accessors: { runtime: null }, runtime: null }
  );
});
