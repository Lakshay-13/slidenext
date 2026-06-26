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

test('captureState reads the live frame through the shared iframe accessor before updating history state', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const captureStateSource = extractFunctionSource(
    fileContent,
    'function captureState() {',
    '\n\n    function updateHistoryButtons() {'
  );

  const iframeDoc = { id: 'doc' };
  const historyEntry = { html: '<html></html>' };
  const capturedCalls = [];
  const context = {
    createHistoryEntry(doc) {
      capturedCalls.push(['createHistoryEntry', doc]);
      return historyEntry;
    },
    getEditorHistoryStackOptions() {
      capturedCalls.push(['getEditorHistoryStackOptions']);
      return { limit: 50 };
    },
    getIframeDoc() {
      capturedCalls.push(['getIframeDoc']);
      return iframeDoc;
    },
    redoStack: ['redo-entry'],
    SlideNextStudioHistory: {
      captureStudioHistoryState(undoStack, redoStack, nextHistoryEntry, options) {
        capturedCalls.push(['captureStudioHistoryState', undoStack, redoStack, nextHistoryEntry, options]);
        return {
          didCapture: true,
          undoStack: ['undo-entry'],
          redoStack: []
        };
      }
    },
    undoStack: [],
    updateHistoryButtons() {
      capturedCalls.push(['updateHistoryButtons']);
    }
  };

  vm.createContext(context);
  vm.runInContext(captureStateSource, context);

  context.captureState();

  assert.equal(context.undoStack.length, 1);
  assert.equal(context.undoStack[0], 'undo-entry');
  assert.equal(context.redoStack.length, 0);
  assert.deepEqual(capturedCalls, [
    ['getIframeDoc'],
    ['createHistoryEntry', iframeDoc],
    ['getEditorHistoryStackOptions'],
    ['captureStudioHistoryState', [], ['redo-entry'], historyEntry, { limit: 50 }],
    ['updateHistoryButtons']
  ]);
});

test('captureState skips history capture when the shared iframe accessor has no live document', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const captureStateSource = extractFunctionSource(
    fileContent,
    'function captureState() {',
    '\n\n    function updateHistoryButtons() {'
  );

  let createHistoryEntryCalls = 0;
  const context = {
    createHistoryEntry() {
      createHistoryEntryCalls += 1;
      return {};
    },
    getIframeDoc() {
      return null;
    },
    redoStack: ['redo-entry'],
    SlideNextStudioHistory: {
      captureStudioHistoryState() {
        throw new Error('captureStudioHistoryState should not run without a live frame document');
      }
    },
    undoStack: ['undo-entry'],
    updateHistoryButtons() {
      throw new Error('updateHistoryButtons should not run without a live frame document');
    }
  };

  vm.createContext(context);
  vm.runInContext(captureStateSource, context);

  context.captureState();

  assert.equal(createHistoryEntryCalls, 0);
  assert.deepEqual(context.undoStack, ['undo-entry']);
  assert.deepEqual(context.redoStack, ['redo-entry']);
});
