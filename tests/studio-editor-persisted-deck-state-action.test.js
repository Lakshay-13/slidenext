const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const persistedDeckStateAction = require('../shared/studio-editor-persisted-deck-state-action.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

test('persisted deck state action prefers the persistence controller', () => {
  const calls = [];
  const updateEditorPersistedDeckState = persistedDeckStateAction.createStudioEditorPersistedDeckStateAction({
    getPersistenceController: () => ({
      update(...args) {
        calls.push(args);
        return 'controller-result';
      }
    })
  });

  assert.equal(updateEditorPersistedDeckState({ cleanHtml: '<html>new</html>' }), 'controller-result');
  assert.deepEqual(calls, [[{ cleanHtml: '<html>new</html>' }]]);
});

test('persisted deck state action lazily caches the shared state adapter', () => {
  let createCalls = 0;
  const persistenceApi = { id: 'persistence-api' };
  const persistedValues = [];
  const updateEditorPersistedDeckState = persistedDeckStateAction.createStudioEditorPersistedDeckStateAction({
    persistenceApi,
    persistenceStateApi: {
      createStudioEditorPersistedDeckStateAdapter(options) {
        createCalls += 1;
        assert.equal(options.persistenceApi, persistenceApi);
        return (nextState) => {
          persistedValues.push(nextState);
          return nextState;
        };
      }
    }
  });

  assert.deepEqual(updateEditorPersistedDeckState({ id: 1 }), { id: 1 });
  assert.deepEqual(updateEditorPersistedDeckState({ id: 2 }), { id: 2 });
  assert.equal(createCalls, 1);
  assert.deepEqual(persistedValues, [{ id: 1 }, { id: 2 }]);
});

test('persisted deck state action returns an empty object without a shared adapter', () => {
  const updateEditorPersistedDeckState = persistedDeckStateAction.createStudioEditorPersistedDeckStateAction({});

  assert.deepEqual(updateEditorPersistedDeckState({ cleanHtml: '<html>new</html>' }), {});
});

test('persisted deck state global API preserves the editor handler name', () => {
  const calls = [];
  const api = persistedDeckStateAction.createStudioEditorPersistedDeckStateGlobalApi({
    updateEditorPersistedDeckState: (...args) => {
      calls.push(args);
      return 'updated';
    }
  });

  assert.equal(api.updateEditorPersistedDeckState({ id: 1 }), 'updated');
  assert.deepEqual(calls, [[{ id: 1 }]]);
});

test('index loads and installs the shared persisted deck state action', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(fileContent, /<script src="\/shared\/studio-editor-persisted-deck-state-action\.js"><\/script>/);
  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-persisted-deck-state-shell-runtime\.js"><\/script>/
  );
  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-persisted-deck-state-runtime-accessors\.js"><\/script>/
  );
  assert.match(
    fileContent,
    /studioEditorPersistedDeckStateRuntimeAccessorsApi\s*\.\s*createStudioEditorPersistedDeckStateRuntimeAccessors\(/
  );
  assert.doesNotMatch(
    fileContent,
    /studioEditorPersistedDeckStateShellRuntimeApi\s*\.\s*createStudioEditorPersistedDeckStateShellRuntime\(/
  );
  assert.match(fileContent, /Object\.assign\(globalThis, studioEditorPersistedDeckStateGlobalApi\);/);
  assert.doesNotMatch(fileContent, /function updateEditorPersistedDeckState\(nextState = \{\}\) \{/);
});
