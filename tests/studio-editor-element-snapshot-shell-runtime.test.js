const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const snapshotShellRuntime = require('../shared/studio-editor-element-snapshot-shell-runtime.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

test('element snapshot shell runtime forwards snapshot callbacks', () => {
  let receivedOptions = null;
  const controller = { build() {} };
  const snapshotControllerApi = {
    createStudioEditorElementSnapshotController(options) {
      receivedOptions = options;
      return controller;
    }
  };
  const options = {
    snapshotControllerApi,
    snapshotApi: { name: 'snapshot' },
    getElementId: () => 'element-1',
    isElementLocked: () => false,
    isElementHidden: () => false,
    isSelectedElement: () => true
  };

  const runtime = snapshotShellRuntime
    .createStudioEditorElementSnapshotShellRuntime(options);

  assert.equal(runtime.isAvailable, true);
  assert.equal(runtime.elementSnapshotController, controller);
  assert.equal(receivedOptions.snapshotApi, options.snapshotApi);
  assert.equal(receivedOptions.getElementId, options.getElementId);
  assert.equal(receivedOptions.isElementLocked, options.isElementLocked);
  assert.equal(receivedOptions.isElementHidden, options.isElementHidden);
  assert.equal(receivedOptions.isSelectedElement, options.isSelectedElement);
});

test('element snapshot shell runtime fails closed when the controller API is unavailable', () => {
  const runtime = snapshotShellRuntime
    .createStudioEditorElementSnapshotShellRuntime({ snapshotControllerApi: null });

  assert.equal(runtime.isAvailable, false);
  assert.equal(runtime.elementSnapshotController, null);
});

test('index routes element snapshot construction through the shell runtime', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-element-snapshot-shell-runtime\.js"><\/script>/
  );
  assert.match(fileContent, /studioEditorElementSnapshotShellRuntimeApi/);
  assert.match(fileContent, /createStudioEditorElementSnapshotShellRuntime/);
  assert.match(
    fileContent,
    /studioEditorElementSnapshotController = studioEditorElementSnapshotShellRuntime/
  );
});
