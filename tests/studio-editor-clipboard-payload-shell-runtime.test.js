const test = require('node:test');
const assert = require('node:assert/strict');

const shellRuntime = require('../shared/studio-editor-clipboard-payload-shell-runtime.js');

test('clipboard payload shell runtime resolves controller, clipboard, DOM, and transform dependencies', () => {
  let receivedOptions = null;
  const resultValue = { name: 'clipboard-payload-runtime' };
  const payloadRuntimeApi = {
    createStudioEditorClipboardPayloadRuntime(options) {
      receivedOptions = options;
      return resultValue;
    }
  };
  const dependencies = {
    controllerApi: { name: 'controller' },
    clipboardApi: { name: 'clipboard' },
    domApi: { name: 'dom' },
    transformApi: { name: 'transform' }
  };
  const callback = () => {};

  const result = shellRuntime.createStudioEditorClipboardPayloadShellRuntime({
    payloadRuntimeApi,
    ...dependencies,
    getIframeDoc: callback
  });

  assert.equal(result, resultValue);
  for (const [key, value] of Object.entries(dependencies)) {
    assert.equal(receivedOptions[key], value);
  }
  assert.equal(receivedOptions.getIframeDoc, callback);
  assert.equal(receivedOptions.payloadRuntimeApi, undefined);
});

test('clipboard payload shell runtime honors explicitly unavailable dependencies', () => {
  let receivedOptions = null;
  const payloadRuntimeApi = {
    createStudioEditorClipboardPayloadRuntime(options) {
      receivedOptions = options;
      return {};
    }
  };

  shellRuntime.createStudioEditorClipboardPayloadShellRuntime({
    payloadRuntimeApi,
    controllerApi: null,
    clipboardApi: null,
    domApi: null,
    transformApi: null
  });

  assert.equal(receivedOptions.controllerApi, null);
  assert.equal(receivedOptions.clipboardApi, null);
  assert.equal(receivedOptions.domApi, null);
  assert.equal(receivedOptions.transformApi, null);
});

test('clipboard payload shell runtime safely returns null without a runtime factory', () => {
  assert.equal(shellRuntime.createStudioEditorClipboardPayloadShellRuntime({}), null);
  assert.equal(
    shellRuntime.createStudioEditorClipboardPayloadShellRuntime({ payloadRuntimeApi: {} }),
    null
  );
});
