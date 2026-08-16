const test = require('node:test');
const assert = require('node:assert/strict');

const shellRuntime = require('../shared/studio-editor-zoom-shell-runtime.js');

test('zoom shell runtime delegates the prepared runtime options', () => {
  let receivedOptions = null;
  const runtimeOptions = { initialZoomFactor: 1 };
  const zoomRuntimeApi = {
    createStudioEditorZoomRuntime(options) {
      receivedOptions = options;
      return { name: 'zoom-runtime' };
    }
  };

  assert.deepEqual(
    shellRuntime.createStudioEditorZoomShellRuntime({
      zoomRuntimeApi,
      runtimeOptions
    }),
    { name: 'zoom-runtime' }
  );
  assert.equal(receivedOptions, runtimeOptions);
});

test('zoom shell runtime accepts flattened options from the runtime accessors', () => {
  let receivedOptions = null;
  const runtimeOptions = {
    documentRef: { name: 'editor-document' },
    initialZoomFactor: 1.1
  };
  const zoomRuntimeApi = {
    createStudioEditorZoomRuntime(options) {
      receivedOptions = options;
      return { name: 'zoom-runtime' };
    }
  };

  assert.deepEqual(
    shellRuntime.createStudioEditorZoomShellRuntime({
      zoomRuntimeApi,
      ...runtimeOptions
    }),
    { name: 'zoom-runtime' }
  );
  assert.deepEqual(receivedOptions, {
    documentRef: runtimeOptions.documentRef,
    initialZoomFactor: runtimeOptions.initialZoomFactor,
    zoomRuntimeApi
  });
});

test('zoom shell runtime safely handles missing runtime factories', () => {
  assert.equal(shellRuntime.createStudioEditorZoomShellRuntime({}), null);
  assert.equal(
    shellRuntime.createStudioEditorZoomShellRuntime({ zoomRuntimeApi: {} }),
    null
  );
});
