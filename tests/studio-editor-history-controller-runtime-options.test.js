const test = require('node:test');
const assert = require('node:assert/strict');

const runtimeOptions = require('../shared/studio-editor-history-controller-runtime-options.js');

test('history controller runtime options preserves injected dependencies and callbacks', () => {
  const dependencies = {
    controllerApi: {},
    historyApi: {},
    historyStateApi: {},
    canonicalStateApi: {},
    restoreApi: {},
    transactionApi: {},
    elementStateApi: {}
  };
  const callbacks = {
    documentRef: {},
    getPendingTransaction() {},
    setPendingTransaction() {},
    getPendingCanonicalDeck() {},
    setPendingCanonicalDeck() {},
    setLiveCanonicalDeck() {},
    getLiveCanonicalDeck() {},
    isCanonicalDeck() {},
    getTimer() {},
    setTimer() {},
    getDocument() {},
    buildCanonicalDeck() {},
    buildMutationCanonicalDeck() {},
    getCanonicalDeckBaseline() {},
    getHistoryOptions() {},
    buildPersistableDeckHtml() {},
    resolveFallbackActiveSlideId() {},
    getActiveSlideId() {},
    getSelectedElementIds() {},
    getHistoryStateOptions() {},
    getUndoStack() {},
    getRedoStack() {},
    setUndoStack() {},
    setRedoStack() {},
    updateHistoryButtons() {},
    triggerAutoSave() {},
    restoreHandlerOptions() {}
  };

  const result = runtimeOptions.createStudioEditorHistoryControllerRuntimeOptions({
    ...dependencies,
    ...callbacks
  });

  assert.deepEqual(result, {
    ...dependencies,
    ...callbacks
  });
});

test('history controller runtime options keeps explicit null dependencies as fail-closed overrides', () => {
  const result = runtimeOptions.createStudioEditorHistoryControllerRuntimeOptions({
    controllerApi: null,
    historyApi: null,
    historyStateApi: null,
    canonicalStateApi: null,
    restoreApi: null,
    transactionApi: null,
    elementStateApi: null
  });

  assert.equal(result.controllerApi, null);
  assert.equal(result.historyApi, null);
  assert.equal(result.historyStateApi, null);
  assert.equal(result.canonicalStateApi, null);
  assert.equal(result.restoreApi, null);
  assert.equal(result.transactionApi, null);
  assert.equal(result.elementStateApi, null);
});
