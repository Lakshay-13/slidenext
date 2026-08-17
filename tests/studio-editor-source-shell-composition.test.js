const test = require('node:test');
const assert = require('node:assert/strict');

const composition = require('../shared/studio-editor-source-shell-composition.js');

test('source shell composition resolves runtime dependencies and preserves options', () => {
  let receivedOptions = null;
  const runtime = { sourceCssResolver: { name: 'source-css' } };
  const accessorsApi = {
    createStudioEditorSourceRuntimeAccessors(options) {
      receivedOptions = options;
      return { runtime };
    }
  };
  const runtimeOptions = { buildSourceHtml: () => '<html></html>' };
  const runtimeApi = { name: 'shell-runtime' };
  const sourceRuntimeApi = { name: 'source-runtime' };

  const result = composition.createStudioEditorSourceShellComposition({
    accessorsApi,
    runtimeApi,
    sourceRuntimeApi,
    runtimeOptions
  });

  assert.equal(result.accessors.runtime, runtime);
  assert.equal(result.runtime, runtime);
  assert.equal(receivedOptions.runtimeApi, runtimeApi);
  assert.equal(receivedOptions.sourceRuntimeApi, sourceRuntimeApi);
  assert.equal(receivedOptions.runtimeOptions.buildSourceHtml, runtimeOptions.buildSourceHtml);
});

test('source shell composition fails closed when accessors are unavailable', () => {
  assert.deepEqual(
    composition.createStudioEditorSourceShellComposition({ accessorsApi: null }),
    { accessors: null, runtime: null }
  );
});
