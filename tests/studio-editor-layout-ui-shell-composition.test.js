const test = require('node:test');
const assert = require('node:assert/strict');

const composition = require('../shared/studio-editor-layout-ui-shell-composition.js');

test('layout UI shell composition resolves the UI runtime and preserves options', () => {
  let receivedOptions = null;
  const runtimeOptions = {
    documentRef: { id: 'document' },
    layoutModeController: { name: 'mode' },
    layoutConversionController: { name: 'conversion' }
  };
  const runtime = { isAvailable: true, layoutUiBridge: { name: 'bridge' } };
  const accessorsApi = {
    createStudioEditorLayoutUiAccessors(options) {
      receivedOptions = options;
      return { runtime };
    }
  };
  const runtimeApi = { createStudioEditorLayoutUiShellRuntime() {} };

  const result = composition.createStudioEditorLayoutUiShellComposition({
    accessorsApi,
    runtimeApi,
    runtimeOptions
  });

  assert.equal(result.accessors.runtime, runtime);
  assert.equal(result.runtime, runtime);
  assert.equal(receivedOptions.runtimeApi, runtimeApi);
  assert.equal(receivedOptions.runtimeOptions, runtimeOptions);
});

test('layout UI shell composition fails closed when accessors are unavailable', () => {
  assert.deepEqual(
    composition.createStudioEditorLayoutUiShellComposition({ accessorsApi: null }),
    { accessors: null, runtime: null }
  );
});
