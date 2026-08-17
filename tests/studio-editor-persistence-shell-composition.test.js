const test = require('node:test');
const assert = require('node:assert/strict');

const composition = require('../shared/studio-editor-persistence-shell-composition.js');

test('persistence shell composition resolves runtime dependencies and preserves callbacks', () => {
  let receivedOptions = null;
  const runtimeOptionsInput = {
    getCurrentPresentationUrl: () => '/presentations/example/index.html',
    createHandlerOptions: () => ({})
  };
  const runtime = { persistenceController: { name: 'persistence' } };
  const accessorsApi = {
    createStudioEditorPersistenceRuntimeAccessors(options) {
      receivedOptions = options;
      return { runtime };
    }
  };
  const runtimeApi = { name: 'shell-runtime' };
  const persistenceRuntimeApi = { name: 'runtime' };

  const result = composition.createStudioEditorPersistenceShellComposition({
    accessorsApi,
    runtimeApi,
    persistenceRuntimeApi,
    runtimeOptions: runtimeOptionsInput
  });

  assert.equal(result.accessors.runtime, runtime);
  assert.equal(result.runtime, runtime);
  assert.equal(receivedOptions.runtimeApi, runtimeApi);
  assert.equal(receivedOptions.persistenceRuntimeApi, persistenceRuntimeApi);
  assert.equal(receivedOptions.runtimeOptions, runtimeOptionsInput);
});

test('persistence shell composition fails closed when accessors are unavailable', () => {
  const result = composition.createStudioEditorPersistenceShellComposition({
    accessorsApi: null,
    runtimeOptions: {}
  });

  assert.deepEqual(result, {
    accessors: null,
    runtime: null
  });
});
