const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const historyStateApi = require('../shared/studio-editor-history-store.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

test('history state composes stacks, pending values, and debounce timing', () => {
  const undoStack = ['undo-entry'];
  const redoStack = ['redo-entry'];
  const transaction = { id: 'transaction-1' };
  const canonicalDeck = { kind: 'slidenext.deck', slides: [{ id: 'slide-1' }] };
  const timer = { id: 'timer-1' };
  const controller = historyStateApi.createStudioEditorHistoryStateController({
    stackController: {
      getUndoStack: () => undoStack,
      getRedoStack: () => redoStack,
      setUndoStack: (value) => value,
      setRedoStack: (value) => value,
      clear: () => ({ undoStack: [], redoStack: [] })
    },
    pendingController: {
      getPendingTransaction: () => transaction,
      setPendingTransaction: (value) => value,
      getPendingCanonicalDeck: () => canonicalDeck,
      setPendingCanonicalDeck: (value) => value,
      clear: () => null
    },
    timerController: {
      getTimer: () => timer,
      setTimer: (value) => value
    }
  });

  assert.deepEqual(controller.getUndoStack(), undoStack);
  assert.deepEqual(controller.getRedoStack(), redoStack);
  assert.equal(controller.getPendingEditorTransaction(), transaction);
  assert.equal(controller.getPendingEditorCanonicalDeck(), canonicalDeck);
  assert.equal(controller.getUndoDebounceTimer(), timer);
  assert.deepEqual(controller.setUndoStack(['undo-next']), ['undo-next']);
  assert.deepEqual(controller.setRedoStack(['redo-next']), ['redo-next']);
  assert.equal(controller.setPendingEditorTransaction({ id: 'transaction-2' }).id, 'transaction-2');
  assert.equal(controller.setPendingEditorCanonicalDeck({ kind: 'slidenext.deck' }).kind, 'slidenext.deck');
  assert.equal(controller.setUndoDebounceTimer({ id: 'timer-2' }).id, 'timer-2');
});
test('history state preserves safe fallbacks when shared controllers are unavailable', () => {
  const controller = historyStateApi.createStudioEditorHistoryStateController({});

  assert.deepEqual(controller.getUndoStack(), []);
  assert.deepEqual(controller.getRedoStack(), []);
  assert.equal(controller.getPendingEditorTransaction(), null);
  assert.equal(controller.getPendingEditorCanonicalDeck(), null);
  assert.equal(controller.getUndoDebounceTimer(), null);
  assert.equal(controller.setUndoStack(['ignored']), false);
  assert.equal(controller.setPendingEditorTransaction({}), false);
  assert.equal(controller.setUndoDebounceTimer({}), false);
});

test('editor routes history state access through the shared composition adapter', () => {
  const source = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(source, /studio-editor-history-store\.js/);
  assert.match(source, /studioEditorHistoryStateController/);
  assert.doesNotMatch(source, /const studioEditorHistoryStackController =/);
  assert.doesNotMatch(source, /const studioEditorHistoryPendingController =/);
  assert.doesNotMatch(source, /const studioEditorHistoryTimerController =/);
});
