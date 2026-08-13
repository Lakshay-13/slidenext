const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const historyRedoAction = require('../shared/studio-editor-history-redo-action.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

test('history redo action delegates to the shared step adapter', () => {
  let calls = 0;
  const editorRedo = historyRedoAction.createStudioEditorHistoryRedoAction({
    getHistoryStepAdapter: () => ({
      redo() {
        calls += 1;
        return 'redo-result';
      }
    })
  });

  assert.equal(editorRedo(), 'redo-result');
  assert.equal(calls, 1);
});

test('history redo action returns the stable fallback when the step adapter is unavailable', () => {
  const editorRedo = historyRedoAction.createStudioEditorHistoryRedoAction({
    getUndoStack: () => ['undo-entry'],
    getRedoStack: () => ['redo-entry']
  });

  assert.deepEqual(editorRedo(), {
    didRedo: false,
    undoStack: ['undo-entry'],
    redoStack: ['redo-entry'],
    restoreEntry: null
  });
});

test('history redo global API preserves the editor handler name', () => {
  const calls = [];
  const api = historyRedoAction.createStudioEditorHistoryRedoGlobalApi({
    editorRedo: (...args) => {
      calls.push(args);
      return 'redo';
    }
  });

  assert.equal(api.editorRedo({ mode: 'history' }), 'redo');
  assert.deepEqual(calls, [[{ mode: 'history' }]]);
});

test('index loads and installs the shared history redo action', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  assert.match(fileContent, /<script src="\/shared\/studio-editor-history-redo-action\.js"><\/script>/);
  assert.match(fileContent, /Object\.assign\(globalThis, studioEditorHistoryRedoGlobalApi\);/);
  assert.match(fileContent, /getHistoryStepAdapter: getEditorHistoryStepAdapter/);
});
