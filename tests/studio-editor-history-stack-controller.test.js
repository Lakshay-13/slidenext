const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const historyStackController = require('../shared/studio-editor-history-stack-controller.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

test('history stack controller owns undo and redo stacks', () => {
  const controller = historyStackController.createStudioEditorHistoryStackController({
    initialUndoStack: ['undo-entry'],
    initialRedoStack: ['redo-entry']
  });

  assert.deepEqual(controller.getState(), {
    undoStack: ['undo-entry'],
    redoStack: ['redo-entry']
  });
  assert.deepEqual(controller.setUndoStack(['undo-next']), ['undo-next']);
  assert.deepEqual(controller.setRedoStack(['redo-next']), ['redo-next']);
  assert.deepEqual(controller.clear(), {
    undoStack: [],
    redoStack: []
  });
});

test('history stack controller isolates stack containers from consumer mutation', () => {
  const initialUndoStack = ['undo-entry'];
  const initialRedoStack = ['redo-entry'];
  const controller = historyStackController.createStudioEditorHistoryStackController({
    initialUndoStack,
    initialRedoStack
  });

  initialUndoStack.push('unexpected-undo');
  initialRedoStack.push('unexpected-redo');
  const exposedState = controller.getState();
  exposedState.undoStack.pop();
  exposedState.redoStack.pop();

  assert.deepEqual(controller.getUndoStack(), ['undo-entry']);
  assert.deepEqual(controller.getRedoStack(), ['redo-entry']);
});

test('editor wiring routes history stacks through the shared controller', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-history-stack-controller\.js"><\/script>/
  );
  assert.match(fileContent, /studio-editor-history-store\.js/);
  assert.match(fileContent, /studioEditorHistoryBridge/);
  assert.match(fileContent, /getUndoStack\(\)/);
  assert.match(fileContent, /getRedoStack\(\)/);
  assert.doesNotMatch(fileContent, /let undoStack = \[\]/);
  assert.doesNotMatch(fileContent, /let redoStack = \[\]/);
});
