const test = require('node:test');
const assert = require('node:assert/strict');

const accessors = require('../shared/studio-editor-persisted-html-runtime-accessors.js');

test('persisted html runtime accessors delegate shell construction and preserve runtime options', () => {
  let receivedOptions = null;
  const runtimeValue = { isAvailable: true, persistedHtmlAction: () => '' };
  const runtimeApi = {
    createStudioEditorPersistedHtmlShellRuntime(options) {
      receivedOptions = options;
      return runtimeValue;
    }
  };
  const runtimeOptions = {
    actionApi: { name: 'action' },
    getPersistenceController: () => null,
    persistenceStateApi: { name: 'persistence-state' }
  };

  const result = accessors.createStudioEditorPersistedHtmlRuntimeAccessors({
    runtimeApi,
    runtimeOptions
  });

  assert.deepEqual(result, { runtime: runtimeValue });
  assert.equal(receivedOptions, runtimeOptions);
});

test('persisted html runtime accessors fail closed without a shell factory', () => {
  assert.deepEqual(
    accessors.createStudioEditorPersistedHtmlRuntimeAccessors({ runtimeApi: {} }),
    { runtime: null }
  );
  assert.deepEqual(
    accessors.createStudioEditorPersistedHtmlRuntimeAccessors({ runtimeApi: null }),
    { runtime: null }
  );
});
