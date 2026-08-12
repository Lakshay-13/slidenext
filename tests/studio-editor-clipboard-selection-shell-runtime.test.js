const test = require('node:test');
const assert = require('node:assert/strict');

const shellRuntime = require('../shared/studio-editor-clipboard-selection-shell-runtime.js');

test('clipboard selection shell runtime resolves controller and clipboard dependencies', () => {
  let receivedOptions = null;
  const resultValue = { name: 'clipboard-selection-runtime' };
  const selectionRuntimeApi = {
    createStudioEditorClipboardSelectionRuntime(options) {
      receivedOptions = options;
      return resultValue;
    }
  };
  const dependencies = {
    controllerApi: { name: 'controller' },
    clipboardApi: { name: 'clipboard' }
  };
  const callback = () => {};

  const result = shellRuntime.createStudioEditorClipboardSelectionShellRuntime({
    selectionRuntimeApi,
    ...dependencies,
    getSelectedElements: callback
  });

  assert.equal(result, resultValue);
  assert.equal(receivedOptions.controllerApi, dependencies.controllerApi);
  assert.equal(receivedOptions.clipboardApi, dependencies.clipboardApi);
  assert.equal(receivedOptions.getSelectedElements, callback);
  assert.equal(receivedOptions.selectionRuntimeApi, undefined);
});

test('clipboard selection shell runtime honors explicitly unavailable dependencies', () => {
  let receivedOptions = null;
  const selectionRuntimeApi = {
    createStudioEditorClipboardSelectionRuntime(options) {
      receivedOptions = options;
      return {};
    }
  };

  shellRuntime.createStudioEditorClipboardSelectionShellRuntime({
    selectionRuntimeApi,
    controllerApi: null,
    clipboardApi: null
  });

  assert.equal(receivedOptions.controllerApi, null);
  assert.equal(receivedOptions.clipboardApi, null);
});

test('clipboard selection shell runtime safely returns null without a runtime factory', () => {
  assert.equal(shellRuntime.createStudioEditorClipboardSelectionShellRuntime({}), null);
  assert.equal(
    shellRuntime.createStudioEditorClipboardSelectionShellRuntime({ selectionRuntimeApi: {} }),
    null
  );
});
