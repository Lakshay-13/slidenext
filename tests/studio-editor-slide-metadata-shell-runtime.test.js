const test = require('node:test');
const assert = require('node:assert/strict');

const shellRuntime = require('../shared/studio-editor-slide-metadata-shell-runtime.js');
const metadataAccessors = require('../shared/studio-editor-slide-metadata-accessors.js');

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

test('slide metadata accessors compose the shell runtime and preserve its result', () => {
  const runtime = { slideMetadataController: { name: 'metadata' } };
  const runtimeOptions = { getActiveSlide: () => null };
  const calls = [];
  const runtimeApi = {
    createStudioEditorSlideMetadataShellRuntime(options) {
      calls.push(options);
      return runtime;
    }
  };
  const accessors = metadataAccessors.createStudioEditorSlideMetadataAccessors({
    runtimeApi,
    metadataRuntimeApi: { name: 'runtime' },
    runtimeOptions
  });

  assert.equal(accessors.runtime, runtime);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].metadataRuntimeApi.name, 'runtime');
  assert.equal(calls[0].runtimeOptions, runtimeOptions);
});

test('slide metadata accessors fail closed when the shell runtime is unavailable', () => {
  const accessors = metadataAccessors.createStudioEditorSlideMetadataAccessors({
    runtimeApi: null
  });

  assert.equal(accessors.runtime, null);
});
