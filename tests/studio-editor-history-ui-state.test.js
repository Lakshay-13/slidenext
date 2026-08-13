const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const historyStackFixture = require('./helpers/studio-history-stack-fixture.js');
const historyEntryAction = require('../shared/studio-editor-history-entry-action.js');
const historyCaptureAction = require('../shared/studio-editor-history-capture-action.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

function extractFunctionSource(fileContent, startMarker, endMarker) {
  const source = historyStackFixture.extractHistoryStackAwareFunctionSource(
    fileContent,
    startMarker,
    endMarker
  );
  assert.notEqual(source, null, `Missing function markers: ${startMarker}`);
  return source;
}

test('createHistoryEntry delegates editor dependencies through the shared history adapter', () => {
  let capturedOptions = null;
  let adapterCalls = 0;
  const getIframeDoc = () => ({ id: 'iframe-doc' });
  const getPendingCanonicalDeck = () => ({ id: 'pending-deck' });
  const getPendingTransaction = () => ({ id: 'pending-transaction' });
  const buildEditorCanonicalDeck = () => ({ id: 'canonical-deck' });
  const buildEditorMutationCanonicalDeck = () => ({ id: 'mutation-deck' });
  const getEditorHistoryOptions = () => ({ id: 'history-options' });
  const resolveEditorFallbackActiveSlideId = () => 'slide-1';
  const buildHistoryFrameHtml = () => '<html></html>';
  const getActiveSlideId = () => 'slide-1';
  const getCommittedSelectedEditorElementIds = () => ['element-1'];
  const createHistoryEntry = historyEntryAction.createStudioEditorHistoryEntryAction({
    historyApi: { id: 'history-api' },
    historyStateApi: {
      createStudioEditorHistoryEntryAdapter(options) {
        capturedOptions = options;
        return doc => {
          adapterCalls += 1;
          return { doc, source: 'shared-adapter' };
        };
      }
    },
    getDocument: getIframeDoc,
    getPendingCanonicalDeck,
    getPendingTransaction,
    buildCanonicalDeck: buildEditorCanonicalDeck,
    buildMutationCanonicalDeck: buildEditorMutationCanonicalDeck,
    getHistoryOptions: getEditorHistoryOptions,
    resolveFallbackActiveSlideId: resolveEditorFallbackActiveSlideId,
    buildHistoryHtml: buildHistoryFrameHtml,
    getActiveSlideId,
    getSelectedElementIds: getCommittedSelectedEditorElementIds
  });

  assert.deepEqual(createHistoryEntry('doc-1'), {
    doc: 'doc-1',
    source: 'shared-adapter'
  });
  assert.deepEqual(createHistoryEntry('doc-2'), {
    doc: 'doc-2',
    source: 'shared-adapter'
  });
  assert.equal(adapterCalls, 2);
  assert.equal(capturedOptions.historyApi.id, 'history-api');
  assert.deepEqual(capturedOptions.getDocument(), getIframeDoc());
  assert.equal(capturedOptions.getPendingCanonicalDeck().id, getPendingCanonicalDeck().id);
  assert.equal(capturedOptions.getPendingTransaction().id, getPendingTransaction().id);
  assert.equal(capturedOptions.buildMutationCanonicalDeck, buildEditorMutationCanonicalDeck);
});

test('captureState delegates editor stacks and pending cleanup through the shared history adapter', () => {
  let capturedOptions = null;
  let adapterCalls = 0;
  const context = {
    SlideNextStudioHistory: { id: 'history-api' },
    SlideNextStudioEditorHistoryState: {
      createStudioEditorHistoryCaptureStateAdapter(options) {
        capturedOptions = options;
        return () => {
          adapterCalls += 1;
          return { didCapture: true, historyEntry: { id: 'entry-1' } };
        };
      }
    },
    pendingEditorTransaction: { id: 'pending-transaction' },
    pendingEditorCanonicalDeck: { id: 'pending-deck' },
    undoStack: ['undo-entry'],
    redoStack: ['redo-entry'],
    createHistoryEntry() {},
    getEditorHistoryStackOptions: () => ({ id: 'history-options' }),
    updateHistoryButtons() {}
  };

  context.captureState = historyCaptureAction.createStudioEditorHistoryCaptureAction({
    historyStateApi: context.SlideNextStudioEditorHistoryState,
    historyApi: context.SlideNextStudioHistory,
    createHistoryEntry: context.createHistoryEntry,
    getUndoStack: () => context.undoStack,
    getRedoStack: () => context.redoStack,
    getHistoryStateOptions: context.getEditorHistoryStackOptions,
    setUndoStack: (nextUndoStack) => {
      context.undoStack = nextUndoStack;
    },
    setRedoStack: (nextRedoStack) => {
      context.redoStack = nextRedoStack;
    },
    updateHistoryButtons: context.updateHistoryButtons,
    clearPendingState: () => {
      context.pendingEditorTransaction = null;
      context.pendingEditorCanonicalDeck = null;
    }
  });

  assert.deepEqual(context.captureState(), {
    didCapture: true,
    historyEntry: { id: 'entry-1' }
  });
  assert.deepEqual(context.captureState(), {
    didCapture: true,
    historyEntry: { id: 'entry-1' }
  });
  assert.equal(adapterCalls, 2);
  assert.equal(capturedOptions.historyApi.id, 'history-api');
  assert.deepEqual(capturedOptions.getUndoStack(), ['undo-entry']);
  assert.deepEqual(capturedOptions.getRedoStack(), ['redo-entry']);
  assert.equal(capturedOptions.createHistoryEntry, context.createHistoryEntry);
  assert.equal(capturedOptions.clearPendingState(), undefined);
  assert.equal(context.pendingEditorTransaction, null);
  assert.equal(context.pendingEditorCanonicalDeck, null);
});

test('flushPendingEditorHistory propagates fallback history capture failures', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const helperSource = extractFunctionSource(
    fileContent,
    'function flushPendingEditorHistory() {',
    '\n\n    function getEditorHistoryStepAdapter() {'
  );
  const context = {
    getStudioPendingEditorTransaction: () => ({ id: 'pending' }),
    getStudioPendingEditorCanonicalDeck: () => null,
    saveHistoryState: () => ({ didCapture: false })
  };

  vm.createContext(context);
  vm.runInContext(helperSource, context);

  assert.equal(context.flushPendingEditorHistory(), false);
});
