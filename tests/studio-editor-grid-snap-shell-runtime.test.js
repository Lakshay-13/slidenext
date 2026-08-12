const test = require('node:test');
const assert = require('node:assert/strict');

const shellRuntime = require('../shared/studio-editor-grid-snap-shell-runtime.js');

test('grid snap shell runtime resolves controller and view dependencies', () => {
  let receivedOptions = null;
  const resultValue = { name: 'grid-snap-runtime' };
  const gridSnapRuntimeApi = {
    createStudioEditorGridSnapRuntime(options) {
      receivedOptions = options;
      return resultValue;
    }
  };
  const dependencies = {
    controllerApi: { name: 'controller' },
    gridSnapView: { name: 'view' }
  };
  const documentRef = {};

  const result = shellRuntime.createStudioEditorGridSnapShellRuntime({
    gridSnapRuntimeApi,
    ...dependencies,
    documentRef,
    gridSizePx: 20
  });

  assert.equal(result, resultValue);
  assert.equal(receivedOptions.controllerApi, dependencies.controllerApi);
  assert.equal(receivedOptions.gridSnapView, dependencies.gridSnapView);
  assert.equal(receivedOptions.documentRef, documentRef);
  assert.equal(receivedOptions.gridSizePx, 20);
  assert.equal(receivedOptions.gridSnapRuntimeApi, undefined);
});

test('grid snap shell runtime honors explicitly unavailable dependencies', () => {
  let receivedOptions = null;
  const gridSnapRuntimeApi = {
    createStudioEditorGridSnapRuntime(options) {
      receivedOptions = options;
      return {};
    }
  };

  shellRuntime.createStudioEditorGridSnapShellRuntime({
    gridSnapRuntimeApi,
    controllerApi: null,
    gridSnapView: null
  });

  assert.equal(receivedOptions.controllerApi, null);
  assert.equal(receivedOptions.gridSnapView, null);
});

test('grid snap shell runtime safely returns null without a runtime factory', () => {
  assert.equal(shellRuntime.createStudioEditorGridSnapShellRuntime({}), null);
  assert.equal(
    shellRuntime.createStudioEditorGridSnapShellRuntime({ gridSnapRuntimeApi: {} }),
    null
  );
});
