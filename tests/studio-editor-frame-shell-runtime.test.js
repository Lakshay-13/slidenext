const test = require('node:test');
const assert = require('node:assert/strict');

const shellRuntime = require('../shared/studio-editor-frame-shell-runtime.js');

test('frame shell runtime delegates the prepared frame options', () => {
  let receivedOptions = null;
  const runtimeOptions = { getIframeDocument: () => null };
  const frameRuntimeApi = {
    createStudioEditorFrameRuntime(options) {
      receivedOptions = options;
      return { name: 'frame-runtime' };
    }
  };

  assert.deepEqual(
    shellRuntime.createStudioEditorFrameShellRuntime({
      frameRuntimeApi,
      runtimeOptions
    }),
    { name: 'frame-runtime' }
  );
  assert.equal(receivedOptions, runtimeOptions);
});

test('frame shell runtime safely handles missing runtime factories', () => {
  assert.equal(shellRuntime.createStudioEditorFrameShellRuntime({}), null);
  assert.equal(
    shellRuntime.createStudioEditorFrameShellRuntime({ frameRuntimeApi: {} }),
    null
  );
});
