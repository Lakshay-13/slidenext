const test = require('node:test');
const assert = require('node:assert/strict');

const accessors = require('../shared/studio-editor-persistence-runtime-accessors.js');

test('persistence runtime accessors delegate shell construction and preserve runtime options', () => {
  let receivedOptions = null;
  const runtimeValue = { persistenceController: { name: 'persistence' } };
  const runtimeApi = {
    createStudioEditorPersistenceShellRuntime(options) {
      receivedOptions = options;
      return runtimeValue;
    }
  };
  const persistenceRuntimeApi = { name: 'persistence-runtime' };
  const runtimeOptions = {
    getPersistedDeckHtml: () => '',
    slideIdAttr: 'data-slide-id'
  };

  const result = accessors.createStudioEditorPersistenceRuntimeAccessors({
    runtimeApi,
    persistenceRuntimeApi,
    runtimeOptions
  });

  assert.deepEqual(result, { runtime: runtimeValue });
  assert.deepEqual(receivedOptions, {
    ...runtimeOptions,
    persistenceRuntimeApi
  });
});

test('persistence runtime accessors fail closed without a shell factory', () => {
  assert.deepEqual(
    accessors.createStudioEditorPersistenceRuntimeAccessors({ runtimeApi: {} }),
    { runtime: null }
  );
  assert.deepEqual(
    accessors.createStudioEditorPersistenceRuntimeAccessors({ runtimeApi: null }),
    { runtime: null }
  );
});
