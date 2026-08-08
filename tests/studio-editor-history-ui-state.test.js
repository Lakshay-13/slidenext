const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

function extractFunctionSource(fileContent, startMarker, endMarker) {
  const start = fileContent.indexOf(startMarker);
  assert.notEqual(start, -1, `Missing start marker: ${startMarker}`);
  const end = fileContent.indexOf(endMarker, start);
  assert.notEqual(end, -1, `Missing end marker: ${endMarker}`);
  return fileContent.slice(start, end);
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
