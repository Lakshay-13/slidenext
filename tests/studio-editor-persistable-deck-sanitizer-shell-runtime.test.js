const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const sanitizerShellRuntime = require('../shared/studio-editor-persistable-deck-sanitizer-shell-runtime.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

test('persistable deck sanitizer shell runtime forwards cleanup dependencies', () => {
  let receivedOptions = null;
  let globalOptions = null;
  const action = () => ({ includePlayback: true });
  const actionApi = {
    createStudioEditorPersistableDeckSanitizerAction(options) {
      receivedOptions = options;
      return action;
    },
    createStudioEditorPersistableDeckSanitizerGlobalApi(options) {
      globalOptions = options;
      return { buildEditorPersistableDeckSanitizerOptions: options.buildEditorPersistableDeckSanitizerOptions };
    }
  };
  const options = {
    actionApi,
    getPersistenceController: () => null,
    persistenceApi: { name: 'persistence' },
    persistenceStateApi: { name: 'persistence-state' },
    getDeckSanitizerOptions: () => ({})
  };

  const runtime = sanitizerShellRuntime
    .createStudioEditorPersistableDeckSanitizerShellRuntime(options);

  assert.equal(runtime.isAvailable, true);
  assert.equal(runtime.persistableDeckSanitizerAction, action);
  assert.equal(receivedOptions.getPersistenceController, options.getPersistenceController);
  assert.equal(receivedOptions.persistenceApi, options.persistenceApi);
  assert.equal(receivedOptions.persistenceStateApi, options.persistenceStateApi);
  assert.equal(receivedOptions.getDeckSanitizerOptions, options.getDeckSanitizerOptions);
  assert.equal(globalOptions.buildEditorPersistableDeckSanitizerOptions, action);
  assert.equal(
    runtime.persistableDeckSanitizerGlobalApi.buildEditorPersistableDeckSanitizerOptions,
    action
  );
});

test('persistable deck sanitizer shell runtime fails closed when the action API is unavailable', () => {
  const runtime = sanitizerShellRuntime
    .createStudioEditorPersistableDeckSanitizerShellRuntime({ actionApi: null });

  assert.equal(runtime.isAvailable, false);
  assert.equal(runtime.persistableDeckSanitizerAction, null);
  assert.deepEqual(runtime.persistableDeckSanitizerGlobalApi, {});
});

test('index routes persistable deck sanitizer installation through the shell runtime', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-persistable-deck-sanitizer-shell-runtime\.js"><\/script>/
  );
  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-persistable-deck-sanitizer-runtime-accessors\.js"><\/script>/
  );
  assert.match(fileContent, /studioEditorPersistableDeckSanitizerShellRuntimeApi/);
  assert.match(
    fileContent,
    /studioEditorPersistableDeckSanitizerRuntimeAccessorsApi\s*\.\s*createStudioEditorPersistableDeckSanitizerRuntimeAccessors\(/
  );
  assert.doesNotMatch(
    fileContent,
    /studioEditorPersistableDeckSanitizerShellRuntimeApi\s*\.\s*createStudioEditorPersistableDeckSanitizerShellRuntime\(/
  );
  assert.match(
    fileContent,
    /studioEditorPersistableDeckSanitizerGlobalApi = studioEditorPersistableDeckSanitizerShellRuntime/
  );
});
