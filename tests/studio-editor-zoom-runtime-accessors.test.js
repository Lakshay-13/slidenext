const test = require('node:test');
const assert = require('node:assert/strict');

const accessors = require('../shared/studio-editor-zoom-runtime-accessors.js');

test('zoom runtime accessors delegate shell construction and preserve runtime options', () => {
  let receivedOptions = null;
  const runtimeValue = { zoomController: { name: 'zoom' } };
  const runtimeApi = {
    createStudioEditorZoomShellRuntime(options) {
      receivedOptions = options;
      return runtimeValue;
    }
  };
  const zoomRuntimeApi = { name: 'zoom-runtime' };
  const runtimeOptions = {
    controllerApi: { name: 'controller' },
    initialZoomFactor: 1
  };

  const result = accessors.createStudioEditorZoomRuntimeAccessors({
    runtimeApi,
    zoomRuntimeApi,
    runtimeOptions
  });

  assert.deepEqual(result, { runtime: runtimeValue });
  assert.deepEqual(receivedOptions, {
    ...runtimeOptions,
    zoomRuntimeApi
  });
});

test('zoom runtime accessors fail closed without a shell factory', () => {
  assert.deepEqual(
    accessors.createStudioEditorZoomRuntimeAccessors({ runtimeApi: {} }),
    { runtime: null }
  );
  assert.deepEqual(
    accessors.createStudioEditorZoomRuntimeAccessors({ runtimeApi: null }),
    { runtime: null }
  );
});
