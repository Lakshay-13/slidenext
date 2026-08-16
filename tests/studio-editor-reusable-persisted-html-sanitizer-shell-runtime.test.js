const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const sanitizerShellRuntime = require('../shared/studio-editor-reusable-persisted-html-sanitizer-shell-runtime.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

test('reusable persisted html sanitizer shell runtime forwards sanitizer dependencies', () => {
  let receivedOptions = null;
  let globalOptions = null;
  const action = () => '<html>sanitized</html>';
  const actionApi = {
    createStudioEditorReusablePersistedHtmlSanitizerAction(options) {
      receivedOptions = options;
      return action;
    },
    createStudioEditorReusablePersistedHtmlSanitizerGlobalApi(options) {
      globalOptions = options;
      return { sanitizeEditorReusablePersistedHtml: options.sanitizeEditorReusablePersistedHtml };
    }
  };
  const options = {
    actionApi,
    getPersistenceController: () => null,
    persistenceApi: { name: 'persistence' },
    persistenceStateApi: { name: 'persistence-state' },
    deckPersistenceApi: { name: 'deck-persistence' },
    buildPersistableDeckHtml: () => '<html>deck</html>',
    buildEditorPersistableDeckSanitizerOptions: () => ({}),
    getBuildEditorPersistableDeckSanitizerOptions: () => () => ({}),
    getDeckSanitizerOptions: () => ({}),
    DOMParser: function DOMParser() {}
  };

  const runtime = sanitizerShellRuntime
    .createStudioEditorReusablePersistedHtmlSanitizerShellRuntime(options);

  assert.equal(runtime.isAvailable, true);
  assert.equal(runtime.reusablePersistedHtmlSanitizerAction, action);
  assert.equal(receivedOptions.getPersistenceController, options.getPersistenceController);
  assert.equal(receivedOptions.persistenceApi, options.persistenceApi);
  assert.equal(receivedOptions.persistenceStateApi, options.persistenceStateApi);
  assert.equal(receivedOptions.deckPersistenceApi, options.deckPersistenceApi);
  assert.equal(receivedOptions.buildPersistableDeckHtml, options.buildPersistableDeckHtml);
  assert.equal(
    receivedOptions.buildEditorPersistableDeckSanitizerOptions,
    options.buildEditorPersistableDeckSanitizerOptions
  );
  assert.equal(
    receivedOptions.getBuildEditorPersistableDeckSanitizerOptions,
    options.getBuildEditorPersistableDeckSanitizerOptions
  );
  assert.equal(receivedOptions.getDeckSanitizerOptions, options.getDeckSanitizerOptions);
  assert.equal(receivedOptions.DOMParser, options.DOMParser);
  assert.equal(globalOptions.sanitizeEditorReusablePersistedHtml, action);
  assert.equal(
    runtime.reusablePersistedHtmlSanitizerGlobalApi.sanitizeEditorReusablePersistedHtml,
    action
  );
});

test('reusable persisted html sanitizer shell runtime fails closed when the action API is unavailable', () => {
  const runtime = sanitizerShellRuntime
    .createStudioEditorReusablePersistedHtmlSanitizerShellRuntime({ actionApi: null });

  assert.equal(runtime.isAvailable, false);
  assert.equal(runtime.reusablePersistedHtmlSanitizerAction, null);
  assert.deepEqual(runtime.reusablePersistedHtmlSanitizerGlobalApi, {});
});

test('index routes reusable persisted html sanitizer installation through the shell runtime', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-reusable-persisted-html-sanitizer-shell-runtime\.js"><\/script>/
  );
  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-reusable-persisted-html-sanitizer-runtime-accessors\.js"><\/script>/
  );
  assert.match(fileContent, /studioEditorReusablePersistedHtmlSanitizerShellRuntimeApi/);
  assert.match(
    fileContent,
    /studioEditorReusablePersistedHtmlSanitizerRuntimeAccessorsApi\s*\.\s*createStudioEditorReusablePersistedHtmlSanitizerRuntimeAccessors\(/
  );
  assert.doesNotMatch(
    fileContent,
    /studioEditorReusablePersistedHtmlSanitizerShellRuntimeApi\s*\.\s*createStudioEditorReusablePersistedHtmlSanitizerShellRuntime\(/
  );
  assert.match(
    fileContent,
    /studioEditorReusablePersistedHtmlSanitizerGlobalApi\s*=\s*studioEditorReusablePersistedHtmlSanitizerShellRuntime/
  );
});
