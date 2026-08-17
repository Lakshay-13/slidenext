const test = require('node:test');
const assert = require('node:assert/strict');

const composition = require('../shared/studio-editor-persisted-html-shell-composition.js');

test('persisted html shell composition resolves the runtime and preserves options', () => {
  let receivedOptions = null;
  const runtimeOptions = {
    getPersistenceController: () => null,
    persistenceStateApi: { name: 'persistence-state' }
  };
  const runtime = {
    isAvailable: true,
    persistedHtmlAction: () => ''
  };
  const accessorsApi = {
    createStudioEditorPersistedHtmlRuntimeAccessors(options) {
      receivedOptions = options;
      return { runtime };
    }
  };
  const runtimeApi = { name: 'persisted-html-shell-runtime' };

  const result = composition.createStudioEditorPersistedHtmlShellComposition({
    accessorsApi,
    runtimeApi,
    runtimeOptions
  });

  assert.equal(result.accessors.runtime, runtime);
  assert.equal(result.runtime, runtime);
  assert.equal(receivedOptions.runtimeApi, runtimeApi);
  assert.equal(receivedOptions.runtimeOptions, runtimeOptions);
});

test('persisted html shell composition fails closed when accessors are unavailable', () => {
  assert.deepEqual(
    composition.createStudioEditorPersistedHtmlShellComposition({ accessorsApi: null }),
    { accessors: null, runtime: null }
  );
});
