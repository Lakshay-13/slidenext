const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const historyUndoAction = require('../shared/studio-editor-history-undo-action.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

test('history undo action delegates to the shared step adapter', () => {
  let calls = 0;
  const editorUndo = historyUndoAction.createStudioEditorHistoryUndoAction({
    getHistoryStepAdapter: () => ({
      undo() {
        calls += 1;
        return 'undo-result';
      }
    })
  });

  assert.equal(editorUndo(), 'undo-result');
  assert.equal(calls, 1);
});

test('history undo action returns the stable fallback when the step adapter is unavailable', () => {
  const editorUndo = historyUndoAction.createStudioEditorHistoryUndoAction({
    getUndoStack: () => ['undo-entry'],
    getRedoStack: () => ['redo-entry']
  });

  assert.deepEqual(editorUndo(), {
    didUndo: false,
    undoStack: ['undo-entry'],
    redoStack: ['redo-entry'],
    restoreEntry: null
  });
});

test('history undo global API preserves the editor handler name', () => {
  const calls = [];
  const api = historyUndoAction.createStudioEditorHistoryUndoGlobalApi({
    editorUndo: (...args) => {
      calls.push(args);
      return 'undo';
    }
  });

  assert.equal(api.editorUndo({ mode: 'history' }), 'undo');
  assert.deepEqual(calls, [[{ mode: 'history' }]]);
});

test('index loads and installs the shared history undo action', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  assert.match(fileContent, /<script src="\/shared\/studio-editor-history-undo-action\.js"><\/script>/);
  assert.match(fileContent, /Object\.assign\(globalThis, studioEditorHistoryUndoGlobalApi\);/);
  assert.match(fileContent, /getHistoryStepAdapter: getEditorHistoryStepAdapter/);
});
