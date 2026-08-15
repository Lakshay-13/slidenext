const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const versionHistoryShellRuntime = require('../shared/studio-editor-version-history-shell-runtime.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

test('version history shell runtime forwards local history workflow callbacks', () => {
  let receivedOptions = null;
  const controller = { load() {} };
  const versionHistoryControllerApi = {
    createStudioEditorVersionHistoryController(options) {
      receivedOptions = options;
      return controller;
    }
  };
  const options = {
    versionHistoryControllerApi,
    versionHistoryApi: { name: 'version-history' },
    getPresentationUrl: () => '/presentations/demo/index.html',
    getSessionToken: () => 7,
    createLoadOptions: () => ({}),
    loadVersionHistory: () => [],
    beforeLoad: () => {},
    reportLoadError: () => {}
  };

  const runtime = versionHistoryShellRuntime
    .createStudioEditorVersionHistoryShellRuntime(options);

  assert.equal(runtime.isAvailable, true);
  assert.equal(runtime.versionHistoryController, controller);
  assert.equal(receivedOptions.versionHistoryApi, options.versionHistoryApi);
  assert.equal(receivedOptions.getPresentationUrl, options.getPresentationUrl);
  assert.equal(receivedOptions.getSessionToken, options.getSessionToken);
  assert.equal(receivedOptions.createLoadOptions, options.createLoadOptions);
  assert.equal(receivedOptions.loadVersionHistory, options.loadVersionHistory);
  assert.equal(receivedOptions.beforeLoad, options.beforeLoad);
  assert.equal(receivedOptions.reportLoadError, options.reportLoadError);
});

test('version history shell runtime fails closed when the shared controller is unavailable', () => {
  const runtime = versionHistoryShellRuntime
    .createStudioEditorVersionHistoryShellRuntime({ versionHistoryControllerApi: null });

  assert.equal(runtime.isAvailable, false);
  assert.equal(runtime.versionHistoryController, null);
});

test('index routes version history construction through the shell runtime', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-version-history-shell-runtime\.js"><\/script>/
  );
  assert.match(fileContent, /studioEditorVersionHistoryShellRuntimeApi/);
  assert.match(fileContent, /createStudioEditorVersionHistoryShellRuntime/);
  assert.match(
    fileContent,
    /studioEditorVersionHistoryController = studioEditorVersionHistoryShellRuntime/
  );
});
