const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ungroupStateShellRuntime = require('../shared/studio-editor-ungroup-state-shell-runtime.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

test('ungroup-state shell runtime forwards selection and group callbacks', () => {
  let receivedOptions = null;
  const controller = { buildActionState() {} };
  const ungroupStateApi = {
    createStudioEditorUngroupStateController(options) {
      receivedOptions = options;
      return controller;
    }
  };
  const options = {
    ungroupStateApi,
    groupApi: { name: 'group' },
    getDocument: () => null,
    getSelectedElements: () => [],
    getActiveSlide: () => null,
    getLiveSelectedElements: (selection) => selection,
    isEditorGroupElement: () => false,
    getActionState: () => ({})
  };

  const runtime = ungroupStateShellRuntime
    .createStudioEditorUngroupStateShellRuntime(options);

  assert.equal(runtime.isAvailable, true);
  assert.equal(runtime.ungroupStateController, controller);
  assert.equal(receivedOptions.groupApi, options.groupApi);
  assert.equal(receivedOptions.getDocument, options.getDocument);
  assert.equal(receivedOptions.getSelectedElements, options.getSelectedElements);
  assert.equal(receivedOptions.getActiveSlide, options.getActiveSlide);
  assert.equal(receivedOptions.getLiveSelectedElements, options.getLiveSelectedElements);
  assert.equal(receivedOptions.isEditorGroupElement, options.isEditorGroupElement);
  assert.equal(receivedOptions.getActionState, options.getActionState);
});

test('ungroup-state shell runtime fails closed when the shared state API is unavailable', () => {
  const runtime = ungroupStateShellRuntime
    .createStudioEditorUngroupStateShellRuntime({ ungroupStateApi: null });

  assert.equal(runtime.isAvailable, false);
  assert.equal(runtime.ungroupStateController, null);
});

test('index routes ungroup-state construction through the shell runtime', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-ungroup-state-shell-runtime\.js"><\/script>/
  );
  assert.match(fileContent, /studioEditorUngroupStateShellRuntimeApi/);
  assert.match(fileContent, /createStudioEditorUngroupStateShellRuntime/);
  assert.match(
    fileContent,
    /studioEditorUngroupStateController = studioEditorUngroupStateShellRuntime/
  );
});
