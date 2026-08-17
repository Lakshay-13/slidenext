const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const snapshotShellRuntime = require('../shared/studio-editor-element-snapshot-shell-runtime.js');
const snapshotRuntimeAccessors = require('../shared/studio-editor-element-snapshot-runtime-accessors.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

test('element snapshot runtime accessors delegate to the shell runtime', () => {
  const runtime = { isAvailable: true, elementSnapshotController: { build() {} } };
  let receivedOptions = null;
  const shellRuntimeApi = {
    createStudioEditorElementSnapshotShellRuntime(options) {
      receivedOptions = options;
      return runtime;
    }
  };
  const snapshotControllerApi = { name: 'snapshot-controller' };
  const snapshotApi = { name: 'snapshot' };

  const result = snapshotRuntimeAccessors
    .createStudioEditorElementSnapshotRuntimeAccessors({
      runtimeApi: shellRuntimeApi,
      snapshotControllerApi,
      runtimeOptions: { snapshotApi }
    });

  assert.deepEqual(result, { runtime });
  assert.equal(receivedOptions.snapshotControllerApi, snapshotControllerApi);
  assert.equal(receivedOptions.snapshotApi, snapshotApi);
});

test('element snapshot runtime accessors fail closed without a shell runtime', () => {
  assert.deepEqual(
    snapshotRuntimeAccessors.createStudioEditorElementSnapshotRuntimeAccessors({
      runtimeApi: null
    }),
    { runtime: null }
  );
});

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
  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-element-snapshot-runtime-accessors\.js"><\/script>/
  );
  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-element-snapshot-shell-composition\.js"><\/script>/
  );
  assert.match(fileContent, /studioEditorElementSnapshotShellCompositionApi/);
  assert.match(fileContent, /createStudioEditorElementSnapshotShellComposition/);
  assert.doesNotMatch(fileContent, /createStudioEditorElementSnapshotRuntimeAccessors/);
  assert.match(
    fileContent,
    /studioEditorElementSnapshotController =\s*\n\s*studioEditorElementSnapshotShellComposition/
  );
});
