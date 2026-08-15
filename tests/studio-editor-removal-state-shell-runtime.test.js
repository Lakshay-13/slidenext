const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const removalStateShellRuntime = require('../shared/studio-editor-removal-state-shell-runtime.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

test('removal state shell runtime forwards selection-state callbacks', () => {
  let receivedOptions = null;
  const controller = { buildActionState() {} };
  const removalStateApi = {
    createStudioEditorRemovalStateController(options) {
      receivedOptions = options;
      return controller;
    }
  };
  const options = {
    removalStateApi,
    removalView: { name: 'removal-view' },
    getDocument: () => null,
    getSelectedElements: () => [],
    getActiveSlide: () => null,
    getLockedState: () => () => false,
    documentRef: { body: {} }
  };

  const runtime = removalStateShellRuntime
    .createStudioEditorRemovalStateShellRuntime(options);

  assert.equal(runtime.isAvailable, true);
  assert.equal(runtime.removalStateController, controller);
  assert.equal(receivedOptions.removalView, options.removalView);
  assert.equal(receivedOptions.getDocument, options.getDocument);
  assert.equal(receivedOptions.getSelectedElements, options.getSelectedElements);
  assert.equal(receivedOptions.getActiveSlide, options.getActiveSlide);
  assert.equal(receivedOptions.getLockedState, options.getLockedState);
  assert.equal(receivedOptions.documentRef, options.documentRef);
});

test('removal state shell runtime fails closed when the shared state API is unavailable', () => {
  const runtime = removalStateShellRuntime
    .createStudioEditorRemovalStateShellRuntime({ removalStateApi: null });

  assert.equal(runtime.isAvailable, false);
  assert.equal(runtime.removalStateController, null);
});

test('index routes removal state construction through the shell runtime', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-removal-state-shell-runtime\.js"><\/script>/
  );
  assert.match(fileContent, /studioEditorRemovalStateShellRuntimeApi/);
  assert.match(fileContent, /createStudioEditorRemovalStateShellRuntime/);
  assert.match(
    fileContent,
    /studioEditorRemovalStateController = studioEditorRemovalStateShellRuntime/
  );
});
