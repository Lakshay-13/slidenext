const test = require('node:test');
const assert = require('node:assert/strict');

const composition = require('../shared/studio-editor-layout-shell-composition.js');

test('layout shell composition resolves runtimes and preserves layout options', () => {
  let receivedOptions = null;
  const runtimeOptions = {
    documentRef: { id: 'document' },
    getSelectedElements: () => [],
    finalizeDeckMutation: () => {}
  };
  const runtime = { nudgeController: { name: 'nudge' } };
  const accessorsApi = {
    createStudioEditorLayoutAccessors(options) {
      receivedOptions = options;
      return { runtime };
    }
  };
  const runtimeApi = { createStudioEditorLayoutShellRuntime() {} };
  const layoutRuntimeApi = { createStudioEditorLayoutRuntime() {} };

  const result = composition.createStudioEditorLayoutShellComposition({
    accessorsApi,
    runtimeApi,
    layoutRuntimeApi,
    runtimeOptions
  });

  assert.equal(result.accessors.runtime, runtime);
  assert.equal(result.runtime, runtime);
  assert.equal(receivedOptions.runtimeApi, runtimeApi);
  assert.equal(receivedOptions.layoutRuntimeApi, layoutRuntimeApi);
  assert.equal(receivedOptions.runtimeOptions, runtimeOptions);
});

test('layout shell composition fails closed when accessors are unavailable', () => {
  assert.deepEqual(
    composition.createStudioEditorLayoutShellComposition({ accessorsApi: null }),
    { accessors: null, runtime: null }
  );
});
