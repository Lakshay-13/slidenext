const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const persistedHtmlShellRuntime = require('../shared/studio-editor-persisted-html-shell-runtime.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

test('persisted html shell runtime forwards persistence dependencies', () => {
  let receivedOptions = null;
  let globalOptions = null;
  const action = () => '<html>saved</html>';
  const actionApi = {
    createStudioEditorPersistedHtmlAction(options) {
      receivedOptions = options;
      return action;
    },
    createStudioEditorPersistedHtmlGlobalApi(options) {
      globalOptions = options;
      return { resolveEditorReusablePersistedHtml: options.resolveEditorReusablePersistedHtml };
    }
  };
  const options = {
    actionApi,
    getPersistenceController: () => null,
    persistenceApi: { name: 'persistence' },
    persistenceStateApi: { name: 'persistence-state' }
  };

  const runtime = persistedHtmlShellRuntime
    .createStudioEditorPersistedHtmlShellRuntime(options);

  assert.equal(runtime.isAvailable, true);
  assert.equal(runtime.persistedHtmlAction, action);
  assert.equal(receivedOptions.getPersistenceController, options.getPersistenceController);
  assert.equal(receivedOptions.persistenceApi, options.persistenceApi);
  assert.equal(receivedOptions.persistenceStateApi, options.persistenceStateApi);
  assert.equal(globalOptions.resolveEditorReusablePersistedHtml, action);
  assert.equal(
    runtime.persistedHtmlGlobalApi.resolveEditorReusablePersistedHtml,
    action
  );
});

test('persisted html shell runtime fails closed when the action API is unavailable', () => {
  const runtime = persistedHtmlShellRuntime
    .createStudioEditorPersistedHtmlShellRuntime({ actionApi: null });

  assert.equal(runtime.isAvailable, false);
  assert.equal(runtime.persistedHtmlAction, null);
  assert.deepEqual(runtime.persistedHtmlGlobalApi, {});
});

test('index routes persisted html installation through the shell runtime', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-persisted-html-shell-runtime\.js"><\/script>/
  );
  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-persisted-html-runtime-accessors\.js"><\/script>/
  );
  assert.match(fileContent, /studioEditorPersistedHtmlShellRuntimeApi/);
  assert.match(
    fileContent,
    /studioEditorPersistedHtmlRuntimeAccessorsApi\s*\.\s*createStudioEditorPersistedHtmlRuntimeAccessors\(/
  );
  assert.doesNotMatch(
    fileContent,
    /studioEditorPersistedHtmlShellRuntimeApi\s*\.\s*createStudioEditorPersistedHtmlShellRuntime\(/
  );
  assert.match(
    fileContent,
    /studioEditorPersistedHtmlGlobalApi = studioEditorPersistedHtmlShellRuntime/
  );
});
