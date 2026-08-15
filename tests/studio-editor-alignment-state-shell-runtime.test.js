const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const alignmentStateShellRuntime = require('../shared/studio-editor-alignment-state-shell-runtime.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

test('alignment-state shell runtime forwards motion and lock callbacks', () => {
  let receivedOptions = null;
  const controller = { buildActionState() {}, sync() {} };
  const alignmentStateApi = {
    createStudioEditorAlignmentStateController(options) {
      receivedOptions = options;
      return controller;
    }
  };
  const options = {
    alignmentStateApi,
    alignmentApi: { name: 'alignment' },
    getDocument: () => null,
    buildMotionActionState: () => ({}),
    getLockedState: () => () => false,
    getActionState: () => ({}),
    documentRef: { id: 'editor' }
  };

  const runtime = alignmentStateShellRuntime
    .createStudioEditorAlignmentStateShellRuntime(options);

  assert.equal(runtime.isAvailable, true);
  assert.equal(runtime.alignmentStateController, controller);
  assert.equal(receivedOptions.alignmentApi, options.alignmentApi);
  assert.equal(receivedOptions.getDocument, options.getDocument);
  assert.equal(receivedOptions.buildMotionActionState, options.buildMotionActionState);
  assert.equal(receivedOptions.getLockedState, options.getLockedState);
  assert.equal(receivedOptions.getActionState, options.getActionState);
  assert.equal(receivedOptions.documentRef, options.documentRef);
});

test('alignment-state shell runtime fails closed when the shared state API is unavailable', () => {
  const runtime = alignmentStateShellRuntime
    .createStudioEditorAlignmentStateShellRuntime({ alignmentStateApi: null });

  assert.equal(runtime.isAvailable, false);
  assert.equal(runtime.alignmentStateController, null);
});

test('index routes alignment-state construction through the shell runtime', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-alignment-state-shell-runtime\.js"><\/script>/
  );
  assert.match(fileContent, /studioEditorAlignmentStateShellRuntimeApi/);
  assert.match(fileContent, /createStudioEditorAlignmentStateShellRuntime/);
  assert.match(
    fileContent,
    /studioEditorAlignmentStateController = studioEditorAlignmentStateShellRuntime/
  );
});
