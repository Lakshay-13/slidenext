const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const buildStateShellRuntime = require('../shared/studio-editor-persistable-deck-build-state-shell-runtime.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

test('persistable deck build-state shell runtime forwards build dependencies', () => {
  let receivedOptions = null;
  let globalOptions = null;
  const action = () => ({ cleanHtml: '<html></html>' });
  const actionApi = {
    createStudioEditorPersistableDeckBuildStateAction(options) {
      receivedOptions = options;
      return action;
    },
    createStudioEditorPersistableDeckBuildStateGlobalApi(options) {
      globalOptions = options;
      return { captureEditorPersistableDeckBuildState: options.captureEditorPersistableDeckBuildState };
    }
  };
  const options = {
    actionApi,
    getDocument: () => null,
    getPersistenceController: () => null,
    persistenceApi: { name: 'persistence' },
    persistenceStateApi: { name: 'persistence-state' },
    buildPersistableDeckHtml: () => '<html></html>',
    getBuildPersistableDeckHtml: () => null
  };

  const runtime = buildStateShellRuntime
    .createStudioEditorPersistableDeckBuildStateShellRuntime(options);

  assert.equal(runtime.isAvailable, true);
  assert.equal(runtime.persistableDeckBuildStateAction, action);
  assert.equal(receivedOptions.getDocument, options.getDocument);
  assert.equal(receivedOptions.getPersistenceController, options.getPersistenceController);
  assert.equal(receivedOptions.persistenceApi, options.persistenceApi);
  assert.equal(receivedOptions.persistenceStateApi, options.persistenceStateApi);
  assert.equal(receivedOptions.buildPersistableDeckHtml, options.buildPersistableDeckHtml);
  assert.equal(receivedOptions.getBuildPersistableDeckHtml, options.getBuildPersistableDeckHtml);
  assert.equal(globalOptions.captureEditorPersistableDeckBuildState, action);
  assert.equal(
    runtime.persistableDeckBuildStateGlobalApi.captureEditorPersistableDeckBuildState,
    action
  );
});

test('persistable deck build-state shell runtime fails closed when the action API is unavailable', () => {
  const runtime = buildStateShellRuntime
    .createStudioEditorPersistableDeckBuildStateShellRuntime({ actionApi: null });

  assert.equal(runtime.isAvailable, false);
  assert.equal(runtime.persistableDeckBuildStateAction, null);
  assert.deepEqual(runtime.persistableDeckBuildStateGlobalApi, {});
});

test('index routes persistable deck build-state installation through the shell runtime', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-persistable-deck-build-state-shell-runtime\.js"><\/script>/
  );
  assert.match(fileContent, /studioEditorPersistableDeckBuildStateShellRuntimeApi/);
  assert.match(fileContent, /createStudioEditorPersistableDeckBuildStateShellRuntime/);
  assert.match(
    fileContent,
    /studioEditorPersistableDeckBuildStateGlobalApi\s*=\s*studioEditorPersistableDeckBuildStateShellRuntime/
  );
});
