const test = require('node:test');
const assert = require('node:assert/strict');

const composition = require('../shared/studio-editor-clipboard-payload-shell-composition.js');

test('clipboard payload shell composition resolves dependencies and exposes the controller', () => {
  let receivedOptions = null;
  const controller = { buildPayload() {} };
  const runtime = { payloadController: controller };
  const accessorsApi = {
    createStudioEditorClipboardPayloadRuntimeAccessors(options) {
      receivedOptions = options;
      return { runtime };
    }
  };
  const runtimeApi = { name: 'shell-runtime' };
  const payloadRuntimeApi = { name: 'runtime' };
  const dependencies = {
    controllerApi: { name: 'controller-api' },
    clipboardApi: { name: 'clipboard' },
    domApi: { name: 'dom' },
    transformApi: { name: 'transform' }
  };
  const getIframeDoc = () => null;

  const result = composition.createStudioEditorClipboardPayloadShellComposition({
    accessorsApi,
    runtimeApi,
    payloadRuntimeApi,
    ...dependencies,
    runtimeOptions: { getIframeDoc }
  });

  assert.equal(result.accessors.runtime, runtime);
  assert.equal(result.runtime, runtime);
  assert.equal(result.controller, controller);
  assert.equal(receivedOptions.runtimeApi, runtimeApi);
  assert.equal(receivedOptions.payloadRuntimeApi, payloadRuntimeApi);
  assert.equal(receivedOptions.runtimeOptions.getIframeDoc, getIframeDoc);
  for (const [key, value] of Object.entries(dependencies)) {
    assert.equal(receivedOptions.runtimeOptions[key], value);
  }
});

test('clipboard payload shell composition fails closed when accessors are unavailable', () => {
  assert.deepEqual(
    composition.createStudioEditorClipboardPayloadShellComposition({ accessorsApi: null }),
    { accessors: null, runtime: null, controller: null }
  );
});
