const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const renameModalShellRuntime = require('../shared/studio-editor-version-rename-modal-shell-runtime.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

test('version rename modal shell runtime forwards local version workflow callbacks', () => {
  let receivedOptions = null;
  const controller = { open() {}, close() {} };
  const modalControllerApi = {
    createStudioEditorVersionRenameModalController(options) {
      receivedOptions = options;
      return controller;
    }
  };
  const options = {
    modalControllerApi,
    documentRef: { id: 'editor-document' },
    setRenameState: () => {},
    clearRenameState: () => {},
    createVersionActionContext: () => ({}),
    resetRenameButton: () => {},
    showModal: () => true,
    hideModal: () => true
  };
  const runtime = renameModalShellRuntime
    .createStudioEditorVersionRenameModalShellRuntime(options);

  assert.equal(runtime.isAvailable, true);
  assert.equal(runtime.versionRenameModalController, controller);
  assert.equal(receivedOptions.documentRef, options.documentRef);
  assert.equal(receivedOptions.setRenameState, options.setRenameState);
  assert.equal(receivedOptions.clearRenameState, options.clearRenameState);
  assert.equal(receivedOptions.createVersionActionContext, options.createVersionActionContext);
  assert.equal(receivedOptions.resetRenameButton, options.resetRenameButton);
  assert.equal(receivedOptions.showModal, options.showModal);
  assert.equal(receivedOptions.hideModal, options.hideModal);
});

test('version rename modal shell runtime fails closed when the shared controller is unavailable', () => {
  const runtime = renameModalShellRuntime
    .createStudioEditorVersionRenameModalShellRuntime({ modalControllerApi: null });

  assert.equal(runtime.isAvailable, false);
  assert.equal(runtime.versionRenameModalController, null);
});

test('index routes version rename modal construction through the shell runtime', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-version-rename-modal-shell-runtime\.js"><\/script>/
  );
  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-version-rename-modal-runtime-accessors\.js"><\/script>/
  );
  assert.match(
    fileContent,
    /createStudioEditorVersionRenameModalRuntimeAccessors\(/
  );
  assert.match(
    fileContent,
    /studioEditorVersionRenameModalController = studioEditorVersionRenameModalShellRuntime/
  );
  assert.doesNotMatch(
    fileContent,
    /studioEditorVersionRenameModalShellRuntimeApi\s*\.\s*createStudioEditorVersionRenameModalShellRuntime\(/
  );
});
