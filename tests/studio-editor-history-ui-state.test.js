const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const historyStackFixture = require('./helpers/studio-history-stack-fixture.js');

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
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const helperSource = extractFunctionSource(
    fileContent,
    'function createHistoryEntry(doc) {',
    '\n\n    function updateEditorPersistedDeckState(nextState = {}) {'
  );
  let capturedOptions = null;
  let adapterCalls = 0;
  const context = {
    SlideNextEditorHistory: {},
    SlideNextStudioHistory: { id: 'history-api' },
    SlideNextStudioEditorHistoryState: {
      createStudioEditorHistoryEntryAdapter(options) {
        capturedOptions = options;
        return doc => {
          adapterCalls += 1;
          return { doc, source: 'shared-adapter' };
        };
      }
    },
    getIframeDoc: () => ({ id: 'iframe-doc' }),
    pendingEditorCanonicalDeck: { id: 'pending-deck' },
    pendingEditorTransaction: { id: 'pending-transaction' },
    buildEditorCanonicalDeck: () => ({ id: 'canonical-deck' }),
    getEditorHistoryOptions: () => ({ id: 'history-options' }),
    resolveEditorFallbackActiveSlideId: () => 'slide-1',
    buildHistoryFrameHtml: () => '<html></html>',
    getActiveSlideId: () => 'slide-1',
    getCommittedSelectedEditorElementIds: () => ['element-1']
  };

  vm.createContext(context);
  vm.runInContext(helperSource, context);

  assert.deepEqual(context.createHistoryEntry('doc-1'), {
    doc: 'doc-1',
    source: 'shared-adapter'
  });
  assert.deepEqual(context.createHistoryEntry('doc-2'), {
    doc: 'doc-2',
    source: 'shared-adapter'
  });
  assert.equal(adapterCalls, 2);
  assert.equal(capturedOptions.historyApi.id, 'history-api');
  assert.deepEqual(capturedOptions.getDocument(), { id: 'iframe-doc' });
  assert.equal(capturedOptions.getPendingCanonicalDeck().id, 'pending-deck');
  assert.equal(capturedOptions.getPendingTransaction().id, 'pending-transaction');
});

test('captureState delegates editor stacks and pending cleanup through the shared history adapter', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const helperSource = extractFunctionSource(
    fileContent,
    'function captureState() {',
    '\n\n    function updateHistoryButtons() {'
  );
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

  vm.createContext(context);
  vm.runInContext(helperSource, context);

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
