const test = require('node:test');
const assert = require('node:assert/strict');

const composition = require('../shared/studio-editor-canonical-shell-composition.js');

test('canonical shell composition resolves the runtime APIs and preserves options', () => {
  let receivedOptions = null;
  const runtime = { canonicalState: { name: 'state' } };
  const accessorsApi = {
    createStudioEditorCanonicalRuntimeAccessors(options) {
      receivedOptions = options;
      return { runtime };
    }
  };
  const runtimeApi = { name: 'shell-runtime' };
  const canonicalRuntimeApi = { name: 'canonical-runtime' };
  const runtimeOptions = {
    canonicalStateApi: { name: 'canonical-state' },
    getPendingCanonicalDeck: () => null
  };

  const result = composition.createStudioEditorCanonicalShellComposition({
    accessorsApi,
    runtimeApi,
    canonicalRuntimeApi,
    runtimeOptions
  });

  assert.equal(result.accessors.runtime, runtime);
  assert.equal(result.runtime, runtime);
  assert.equal(receivedOptions.runtimeApi, runtimeApi);
  assert.equal(receivedOptions.canonicalRuntimeApi, canonicalRuntimeApi);
  assert.equal(receivedOptions.runtimeOptions, runtimeOptions);
});

test('canonical shell composition fails closed when accessors are unavailable', () => {
  assert.deepEqual(
    composition.createStudioEditorCanonicalShellComposition({ accessorsApi: null }),
    { accessors: null, runtime: null }
  );
});
