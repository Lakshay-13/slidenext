const test = require('node:test');
const assert = require('node:assert/strict');

const runtimeOptions = require('../shared/studio-editor-canonical-runtime-options.js');

test('canonical runtime options preserves injected dependencies and callbacks', () => {
  const dependencies = {
    canonicalStateApi: {},
    canonicalDeckApi: {},
    canonicalMutationApi: {},
    canonicalBridgeApi: {}
  };
  const callbacks = {
    isCanonicalDeck() {},
    getCurrentPresentationMetadata() {},
    getPersistedCanonicalDeck() {},
    resolveLiveCanonicalDeck() {},
    resolveStoredCanonicalBaseline() {},
    buildPresentationMetadataSeed() {},
    getPresentationUrl() {},
    getPresentationTitle() {},
    buildStudioCanonicalDeck() {},
    buildCanonicalDeckFromDocument() {},
    getSlideId() {},
    getNodeId() {},
    buildCanonicalDeck() {},
    getCanonicalDeckBaseline() {},
    getDocument() {}
  };

  const result = runtimeOptions.createStudioEditorCanonicalRuntimeOptions({
    ...dependencies,
    ...callbacks
  });

  assert.deepEqual(result, {
    ...dependencies,
    ...callbacks
  });
});

test('canonical runtime options keeps explicit null dependencies as fail-closed overrides', () => {
  const result = runtimeOptions.createStudioEditorCanonicalRuntimeOptions({
    canonicalStateApi: null,
    canonicalDeckApi: null,
    canonicalMutationApi: null,
    canonicalBridgeApi: null
  });

  assert.equal(result.canonicalStateApi, null);
  assert.equal(result.canonicalDeckApi, null);
  assert.equal(result.canonicalMutationApi, null);
  assert.equal(result.canonicalBridgeApi, null);
});
