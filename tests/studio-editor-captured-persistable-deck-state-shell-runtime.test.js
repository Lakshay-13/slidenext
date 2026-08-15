const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const capturedStateShellRuntime = require('../shared/studio-editor-captured-persistable-deck-state-shell-runtime.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

test('captured persistable deck state shell runtime forwards resolver dependencies', () => {
  let receivedOptions = null;
  let globalOptions = null;
  const action = () => ({ cleanHtml: '<html></html>' });
  const actionApi = {
    createStudioEditorCapturedPersistableDeckStateAction(options) {
      receivedOptions = options;
      return action;
    },
    createStudioEditorCapturedPersistableDeckStateGlobalApi(options) {
      globalOptions = options;
      return { resolveEditorCapturedPersistableDeckState: options.resolveEditorCapturedPersistableDeckState };
    }
  };
  const options = {
    actionApi,
    getPersistenceController: () => null,
    persistenceApi: { name: 'persistence' },
    persistenceStateApi: { name: 'persistence-state' }
  };

  const runtime = capturedStateShellRuntime
    .createStudioEditorCapturedPersistableDeckStateShellRuntime(options);

  assert.equal(runtime.isAvailable, true);
  assert.equal(runtime.capturedPersistableDeckStateAction, action);
  assert.equal(receivedOptions.getPersistenceController, options.getPersistenceController);
  assert.equal(receivedOptions.persistenceApi, options.persistenceApi);
  assert.equal(receivedOptions.persistenceStateApi, options.persistenceStateApi);
  assert.equal(globalOptions.resolveEditorCapturedPersistableDeckState, action);
  assert.equal(
    runtime.capturedPersistableDeckStateGlobalApi.resolveEditorCapturedPersistableDeckState,
    action
  );
});

test('captured persistable deck state shell runtime fails closed when the action API is unavailable', () => {
  const runtime = capturedStateShellRuntime
    .createStudioEditorCapturedPersistableDeckStateShellRuntime({ actionApi: null });

  assert.equal(runtime.isAvailable, false);
  assert.equal(runtime.capturedPersistableDeckStateAction, null);
  assert.deepEqual(runtime.capturedPersistableDeckStateGlobalApi, {});
});

test('index routes captured persistable deck state installation through the shell runtime', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-captured-persistable-deck-state-shell-runtime\.js"><\/script>/
  );
  assert.match(fileContent, /studioEditorCapturedPersistableDeckStateShellRuntimeApi/);
  assert.match(fileContent, /createStudioEditorCapturedPersistableDeckStateShellRuntime/);
  assert.match(
    fileContent,
    /studioEditorCapturedPersistableDeckStateGlobalApi\s*=\s*studioEditorCapturedPersistableDeckStateShellRuntime/
  );
});
