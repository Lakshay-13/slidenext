const test = require('node:test');
const assert = require('node:assert/strict');

const shellRuntime = require('../shared/studio-editor-slide-metadata-shell-runtime.js');

test('slide metadata shell runtime delegates the prepared metadata options', () => {
  let receivedOptions = null;
  const runtimeOptions = { getActiveSlide: () => null };
  const metadataRuntimeApi = {
    createStudioEditorSlideMetadataRuntime(options) {
      receivedOptions = options;
      return { name: 'slide-metadata-runtime' };
    }
  };

  assert.deepEqual(
    shellRuntime.createStudioEditorSlideMetadataShellRuntime({
      metadataRuntimeApi,
      runtimeOptions
    }),
    { name: 'slide-metadata-runtime' }
  );
  assert.equal(receivedOptions, runtimeOptions);
});

test('slide metadata shell runtime safely handles missing runtime factories', () => {
  assert.equal(shellRuntime.createStudioEditorSlideMetadataShellRuntime({}), null);
  assert.equal(
    shellRuntime.createStudioEditorSlideMetadataShellRuntime({ metadataRuntimeApi: {} }),
    null
  );
});
