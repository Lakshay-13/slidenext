const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const historyRuntime = require('../shared/studio-editor-history-controller-runtime.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

test('history controller runtime preserves the full controller dependency bundle', () => {
  const calls = [];
  const controllerApi = {
    createStudioEditorHistoryController(options) {
      calls.push(options);
      return { name: 'history' };
    }
  };
  const options = {
    controllerApi,
    documentRef: {},
    historyApi: null,
    historyStateApi: {},
    canonicalStateApi: {},
    restoreApi: {},
    transactionApi: {},
    elementStateApi: {},
    getPendingTransaction: () => null,
    setPendingTransaction: () => {},
    getPendingCanonicalDeck: () => null,
    setPendingCanonicalDeck: () => {},
    setLiveCanonicalDeck: () => {},
    getLiveCanonicalDeck: () => null,
    isCanonicalDeck: () => true,
    getTimer: () => null,
    setTimer: () => {},
    getDocument: () => null,
    buildCanonicalDeck: () => null,
    buildMutationCanonicalDeck: () => null,
    getCanonicalDeckBaseline: () => null,
    getHistoryOptions: () => ({}),
    buildPersistableDeckHtml: () => '',
    resolveFallbackActiveSlideId: () => '',
    getActiveSlideId: () => '',
    getSelectedElementIds: () => [],
    getHistoryStateOptions: () => ({}),
    getUndoStack: () => [],
    getRedoStack: () => [],
    setUndoStack: () => {},
    setRedoStack: () => {},
    updateHistoryButtons: () => {},
    triggerAutoSave: () => {},
    restoreHandlerOptions: () => ({})
  };

  assert.deepEqual(
    historyRuntime.createStudioEditorHistoryControllerRuntime(options),
    { historyController: { name: 'history' } }
  );
  assert.equal(calls.length, 1);
  assert.equal(calls[0].historyApi, null);
  assert.equal(calls[0].historyStateApi, options.historyStateApi);
  assert.equal(calls[0].canonicalStateApi, options.canonicalStateApi);
  assert.equal(calls[0].restoreApi, options.restoreApi);
  assert.equal(calls[0].getPendingTransaction, options.getPendingTransaction);
  assert.equal(calls[0].setLiveCanonicalDeck, options.setLiveCanonicalDeck);
  assert.equal(calls[0].getLiveCanonicalDeck, options.getLiveCanonicalDeck);
  assert.equal(calls[0].buildMutationCanonicalDeck, options.buildMutationCanonicalDeck);
  assert.equal(calls[0].resolveFallbackActiveSlideId, options.resolveFallbackActiveSlideId);
  assert.equal(calls[0].restoreHandlerOptions, options.restoreHandlerOptions);
});

test('index wires the history controller through its runtime module', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-history-controller-runtime-options\.js"><\/script>/
  );
  assert.match(
    fileContent,
    /studioEditorHistoryControllerRuntimeOptionsApi\.createStudioEditorHistoryControllerRuntimeOptions\(/
  );
  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-history-controller-runtime\.js"><\/script>/
  );
  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-history-controller-shell-runtime\.js"><\/script>/
  );
  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-history-controller-runtime-accessors\.js"><\/script>/
  );
  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-history-controller-shell-composition\.js"><\/script>/
  );
  assert.match(
    fileContent,
    /studioEditorHistoryControllerShellCompositionApi\s*\.\s*createStudioEditorHistoryControllerShellComposition\(/
  );
  assert.match(
    fileContent,
    /studioEditorHistoryControllerRuntime = studioEditorHistoryControllerShellComposition/
  );
  assert.doesNotMatch(
    fileContent,
    /SlideNextStudioEditorHistoryControllerShellRuntime\.createStudioEditorHistoryControllerShellRuntime\(/
  );
  assert.doesNotMatch(
    fileContent,
    /studioEditorHistoryControllerRuntimeAccessorsApi\s*\.\s*createStudioEditorHistoryControllerRuntimeAccessors\(/
  );
  assert.doesNotMatch(
    fileContent,
    /SlideNextStudioEditorHistoryController\.createStudioEditorHistoryController\(/
  );
});
