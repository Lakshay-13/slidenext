const test = require('node:test');
const assert = require('node:assert/strict');

const composition = require('../shared/studio-editor-deck-view-shell-composition.js');

test('deck-view shell composition resolves dependencies and preserves callbacks', () => {
  let receivedOptions = null;
  const runtime = { exportController: { name: 'export' } };
  const accessorsApi = {
    createStudioEditorDeckViewRuntimeAccessors(options) {
      receivedOptions = options;
      return { runtime };
    }
  };
  const dependencies = {
    exportApi: { name: 'export-api' },
    snapshotControllerApi: { name: 'snapshot' },
    previewControllerApi: { name: 'preview' },
    sourceControllerApi: { name: 'source' },
    exportActions: { name: 'export-actions' }
  };
  const buildCanonicalDeck = () => null;
  const runtimeOptions = { buildCanonicalDeck };

  const result = composition.createStudioEditorDeckViewShellComposition({
    accessorsApi,
    runtimeApi: { name: 'shell-runtime' },
    deckViewRuntimeApi: { name: 'runtime-api' },
    ...dependencies,
    runtimeOptions
  });

  assert.equal(result.accessors.runtime, runtime);
  assert.equal(result.runtime, runtime);
  assert.equal(receivedOptions.runtimeOptions.buildCanonicalDeck, buildCanonicalDeck);
  for (const [key, value] of Object.entries(dependencies)) {
    assert.equal(receivedOptions.runtimeOptions[key], value);
  }
});

test('deck-view shell composition fails closed when accessors are unavailable', () => {
  assert.deepEqual(
    composition.createStudioEditorDeckViewShellComposition({ accessorsApi: null }),
    { accessors: null, runtime: null }
  );
});
