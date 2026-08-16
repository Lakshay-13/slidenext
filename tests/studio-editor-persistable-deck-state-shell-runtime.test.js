const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const persistableStateShellRuntime = require('../shared/studio-editor-persistable-deck-state-shell-runtime.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

test('persistable deck state shell runtime forwards capture dependencies', () => {
  let receivedOptions = null;
  let globalOptions = null;
  const action = () => ({ cleanHtml: '<html></html>' });
  const actionApi = {
    createStudioEditorPersistableDeckStateAction(options) {
      receivedOptions = options;
      return action;
    },
    createStudioEditorPersistableDeckStateGlobalApi(options) {
      globalOptions = options;
      return { captureEditorPersistableDeckState: options.captureEditorPersistableDeckState };
    }
  };
  const options = {
    actionApi,
    getDocument: () => null,
    getPersistenceController: () => null,
    persistenceApi: { name: 'persistence' },
    persistenceStateApi: { name: 'persistence-state' },
    getCaptureBuildState: () => null,
    getResolveCapturedState: () => null,
    getCapturePlaybackState: () => null,
    resolveCanonicalDeck: () => null
  };

  const runtime = persistableStateShellRuntime
    .createStudioEditorPersistableDeckStateShellRuntime(options);

  assert.equal(runtime.isAvailable, true);
  assert.equal(runtime.persistableDeckStateAction, action);
  assert.equal(receivedOptions.getDocument, options.getDocument);
  assert.equal(receivedOptions.getPersistenceController, options.getPersistenceController);
  assert.equal(receivedOptions.persistenceApi, options.persistenceApi);
  assert.equal(receivedOptions.persistenceStateApi, options.persistenceStateApi);
  assert.equal(receivedOptions.getCaptureBuildState, options.getCaptureBuildState);
  assert.equal(receivedOptions.getResolveCapturedState, options.getResolveCapturedState);
  assert.equal(receivedOptions.getCapturePlaybackState, options.getCapturePlaybackState);
  assert.equal(receivedOptions.resolveCanonicalDeck, options.resolveCanonicalDeck);
  assert.equal(globalOptions.captureEditorPersistableDeckState, action);
  assert.equal(
    runtime.persistableDeckStateGlobalApi.captureEditorPersistableDeckState,
    action
  );
});

test('persistable deck state shell runtime fails closed when the action API is unavailable', () => {
  const runtime = persistableStateShellRuntime
    .createStudioEditorPersistableDeckStateShellRuntime({ actionApi: null });

  assert.equal(runtime.isAvailable, false);
  assert.equal(runtime.persistableDeckStateAction, null);
  assert.deepEqual(runtime.persistableDeckStateGlobalApi, {});
});

test('index routes persistable deck state installation through the shell runtime', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-persistable-deck-state-shell-runtime\.js"><\/script>/
  );
  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-persistable-deck-state-runtime-accessors\.js"><\/script>/
  );
  assert.match(fileContent, /studioEditorPersistableDeckStateShellRuntimeApi/);
  assert.match(
    fileContent,
    /studioEditorPersistableDeckStateRuntimeAccessorsApi\s*\.\s*createStudioEditorPersistableDeckStateRuntimeAccessors\(/
  );
  assert.doesNotMatch(
    fileContent,
    /studioEditorPersistableDeckStateShellRuntimeApi\s*\.\s*createStudioEditorPersistableDeckStateShellRuntime\(/
  );
  assert.match(
    fileContent,
    /studioEditorPersistableDeckStateGlobalApi\s*=\s*studioEditorPersistableDeckStateShellRuntime/
  );
});
