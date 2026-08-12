const test = require('node:test');
const assert = require('node:assert/strict');

const shellRuntime = require('../shared/studio-editor-deck-view-shell-runtime.js');

test('deck view shell runtime resolves dependencies and preserves composition callbacks', () => {
  let receivedOptions = null;
  const resultValue = { name: 'deck-view-runtime' };
  const deckViewRuntimeApi = {
    createStudioEditorDeckViewRuntime(options) {
      receivedOptions = options;
      return resultValue;
    }
  };
  const callbacks = {
    buildCanonicalDeck() {},
    resolveReadyState() {}
  };
  const dependencies = {
    exportApi: { name: 'export' },
    snapshotControllerApi: { name: 'snapshot' },
    previewControllerApi: { name: 'preview' },
    sourceControllerApi: { name: 'source' },
    exportActions: { name: 'actions' }
  };

  const result = shellRuntime.createStudioEditorDeckViewShellRuntime({
    deckViewRuntimeApi,
    ...dependencies,
    ...callbacks
  });

  assert.equal(result, resultValue);
  assert.equal(receivedOptions.exportApi, dependencies.exportApi);
  assert.equal(receivedOptions.snapshotControllerApi, dependencies.snapshotControllerApi);
  assert.equal(receivedOptions.previewControllerApi, dependencies.previewControllerApi);
  assert.equal(receivedOptions.sourceControllerApi, dependencies.sourceControllerApi);
  assert.equal(receivedOptions.exportActions, dependencies.exportActions);
  assert.equal(receivedOptions.buildCanonicalDeck, callbacks.buildCanonicalDeck);
  assert.equal(receivedOptions.resolveReadyState, callbacks.resolveReadyState);
  assert.equal(receivedOptions.deckViewRuntimeApi, undefined);
});

test('deck view shell runtime honors explicitly unavailable dependencies', () => {
  let receivedOptions = null;
  const deckViewRuntimeApi = {
    createStudioEditorDeckViewRuntime(options) {
      receivedOptions = options;
      return {};
    }
  };

  shellRuntime.createStudioEditorDeckViewShellRuntime({
    deckViewRuntimeApi,
    exportApi: null,
    snapshotControllerApi: null,
    previewControllerApi: null,
    sourceControllerApi: null,
    exportActions: null
  });

  assert.equal(receivedOptions.exportApi, null);
  assert.equal(receivedOptions.snapshotControllerApi, null);
  assert.equal(receivedOptions.previewControllerApi, null);
  assert.equal(receivedOptions.sourceControllerApi, null);
  assert.equal(receivedOptions.exportActions, null);
});

test('deck view shell runtime safely returns null without a runtime factory', () => {
  assert.equal(shellRuntime.createStudioEditorDeckViewShellRuntime({}), null);
  assert.equal(
    shellRuntime.createStudioEditorDeckViewShellRuntime({
      deckViewRuntimeApi: {}
    }),
    null
  );
});
