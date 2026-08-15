const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const persistedStateShellRuntime = require('../shared/studio-editor-persisted-deck-state-shell-runtime.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

test('persisted deck state shell runtime forwards canonical persistence callbacks', () => {
  let receivedOptions = null;
  let globalOptions = null;
  const action = () => ({ updated: true });
  const actionApi = {
    createStudioEditorPersistedDeckStateAction(options) {
      receivedOptions = options;
      return action;
    },
    createStudioEditorPersistedDeckStateGlobalApi(options) {
      globalOptions = options;
      return { updateEditorPersistedDeckState: options.updateEditorPersistedDeckState };
    }
  };
  const options = {
    actionApi,
    getPersistenceController: () => null,
    persistenceApi: { name: 'persistence' },
    persistenceStateApi: { name: 'persistence-state' },
    resolveCanonicalDeck: () => null,
    normalizePlaybackState: () => null,
    setPersistedDeckHtml: () => {},
    setPersistedCanonicalDeck: () => {},
    setPersistedPlaybackState: () => {}
  };

  const runtime = persistedStateShellRuntime
    .createStudioEditorPersistedDeckStateShellRuntime(options);

  assert.equal(runtime.isAvailable, true);
  assert.equal(runtime.persistedDeckStateAction, action);
  assert.equal(receivedOptions.getPersistenceController, options.getPersistenceController);
  assert.equal(receivedOptions.persistenceApi, options.persistenceApi);
  assert.equal(receivedOptions.persistenceStateApi, options.persistenceStateApi);
  assert.equal(receivedOptions.resolveCanonicalDeck, options.resolveCanonicalDeck);
  assert.equal(receivedOptions.normalizePlaybackState, options.normalizePlaybackState);
  assert.equal(receivedOptions.setPersistedDeckHtml, options.setPersistedDeckHtml);
  assert.equal(receivedOptions.setPersistedCanonicalDeck, options.setPersistedCanonicalDeck);
  assert.equal(receivedOptions.setPersistedPlaybackState, options.setPersistedPlaybackState);
  assert.equal(globalOptions.updateEditorPersistedDeckState, action);
  assert.equal(
    runtime.persistedDeckStateGlobalApi.updateEditorPersistedDeckState,
    action
  );
});

test('persisted deck state shell runtime fails closed when the action API is unavailable', () => {
  const runtime = persistedStateShellRuntime
    .createStudioEditorPersistedDeckStateShellRuntime({ actionApi: null });

  assert.equal(runtime.isAvailable, false);
  assert.equal(runtime.persistedDeckStateAction, null);
  assert.deepEqual(runtime.persistedDeckStateGlobalApi, {});
});

test('index routes persisted deck state installation through the shell runtime', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-persisted-deck-state-shell-runtime\.js"><\/script>/
  );
  assert.match(fileContent, /studioEditorPersistedDeckStateShellRuntimeApi/);
  assert.match(fileContent, /createStudioEditorPersistedDeckStateShellRuntime/);
  assert.match(
    fileContent,
    /studioEditorPersistedDeckStateGlobalApi = studioEditorPersistedDeckStateShellRuntime/
  );
});
