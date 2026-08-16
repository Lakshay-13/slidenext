const test = require('node:test');
const assert = require('node:assert/strict');

const shellRuntime = require('../shared/studio-editor-persistence-shell-runtime.js');

test('persistence shell runtime delegates prepared save and version options', () => {
  let receivedOptions = null;
  const runtimeOptions = { name: 'persistence-options' };
  const persistenceRuntimeApi = {
    createStudioEditorPersistenceRuntime(options) {
      receivedOptions = options;
      return { name: 'persistence-runtime' };
    }
  };

  const result = shellRuntime.createStudioEditorPersistenceShellRuntime({
    persistenceRuntimeApi,
    runtimeOptions
  });

  assert.deepEqual(result, { name: 'persistence-runtime' });
  assert.equal(receivedOptions, runtimeOptions);
});

test('persistence shell runtime accepts flattened options from the runtime accessors', () => {
  let receivedOptions = null;
  const runtimeOptions = {
    getCurrentPresentationUrl: () => '/presentations/example/index.html',
    deckPersistenceApi: { name: 'deck-persistence' }
  };
  const persistenceRuntimeApi = {
    createStudioEditorPersistenceRuntime(options) {
      receivedOptions = options;
      return { name: 'persistence-runtime' };
    }
  };

  assert.deepEqual(
    shellRuntime.createStudioEditorPersistenceShellRuntime({
      persistenceRuntimeApi,
      ...runtimeOptions
    }),
    { name: 'persistence-runtime' }
  );
  assert.deepEqual(receivedOptions, {
    getCurrentPresentationUrl: runtimeOptions.getCurrentPresentationUrl,
    deckPersistenceApi: runtimeOptions.deckPersistenceApi,
    persistenceRuntimeApi
  });
});

test('persistence shell runtime safely handles missing options or factory', () => {
  let receivedOptions = null;
  const persistenceRuntimeApi = {
    createStudioEditorPersistenceRuntime(options) {
      receivedOptions = options;
      return null;
    }
  };

  assert.equal(
    shellRuntime.createStudioEditorPersistenceShellRuntime({ persistenceRuntimeApi }),
    null
  );
  assert.deepEqual(receivedOptions, { persistenceRuntimeApi });
  assert.equal(shellRuntime.createStudioEditorPersistenceShellRuntime({}), null);
  assert.equal(
    shellRuntime.createStudioEditorPersistenceShellRuntime({ persistenceRuntimeApi: {} }),
    null
  );
});
