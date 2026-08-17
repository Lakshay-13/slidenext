const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const bridgeApi = require('../shared/studio-editor-history-bridge.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

test('history bridge composes the runtime and delegates all history state access', () => {
  const controller = {
    getUndoStack: () => ['undo'],
    getRedoStack: () => ['redo'],
    setUndoStack: (value) => value,
    setRedoStack: (value) => value,
    clearHistoryStacks: () => true,
    getPendingEditorTransaction: () => ({ id: 'tx' }),
    setPendingEditorTransaction: (value) => value,
    clearPendingEditorTransaction: () => true,
    getPendingEditorCanonicalDeck: (sourceDocument) => {
      assert.equal(sourceDocument, documentRef);
      return { kind: 'slidenext.deck' };
    },
    setPendingEditorCanonicalDeck: (value) => value,
    getUndoDebounceTimer: () => 10,
    setUndoDebounceTimer: (value) => value
  };
  const documentRef = { id: 'editor-document' };
  const historyStore = { name: 'history-store' };
  const runtimeApi = {
    createStudioEditorHistoryRuntime(options) {
      assert.equal(options.historyStore, historyStore);
      return { historyStateController: controller };
    }
  };

  const bridge = bridgeApi.createStudioEditorHistoryBridge({
    runtimeApi,
    historyStore
  });

  assert.deepEqual(bridge.getUndoStack(), ['undo']);
  assert.deepEqual(bridge.getRedoStack(), ['redo']);
  assert.deepEqual(bridge.setUndoStack(['next-undo']), ['next-undo']);
  assert.deepEqual(bridge.setRedoStack(['next-redo']), ['next-redo']);
  assert.equal(bridge.clearHistoryStacks(), true);
  assert.deepEqual(bridge.getPendingEditorTransaction(), { id: 'tx' });
  assert.deepEqual(bridge.setPendingEditorTransaction({ id: 'next-tx' }), { id: 'next-tx' });
  assert.equal(bridge.clearPendingEditorTransaction(), true);
  assert.deepEqual(bridge.getPendingEditorCanonicalDeck(documentRef), { kind: 'slidenext.deck' });
  assert.deepEqual(bridge.setPendingEditorCanonicalDeck({ id: 'next-deck' }), { id: 'next-deck' });
  assert.equal(bridge.getUndoDebounceTimer(), 10);
  assert.equal(bridge.setUndoDebounceTimer(20), 20);
  assert.equal(bridge.historyStateController, controller);
});

test('history bridge preserves safe fallbacks without a runtime', () => {
  const bridge = bridgeApi.createStudioEditorHistoryBridge({ runtimeApi: null });

  assert.equal(bridge.runtime, null);
  assert.equal(bridge.historyStateController, null);
  assert.deepEqual(bridge.getUndoStack(), []);
  assert.deepEqual(bridge.getRedoStack(), []);
  assert.equal(bridge.setUndoStack([]), false);
  assert.equal(bridge.setRedoStack([]), false);
  assert.equal(bridge.clearHistoryStacks(), false);
  assert.equal(bridge.getPendingEditorTransaction(), null);
  assert.equal(bridge.setPendingEditorTransaction({}), false);
  assert.equal(bridge.clearPendingEditorTransaction(), false);
  assert.equal(bridge.getPendingEditorCanonicalDeck(), null);
  assert.equal(bridge.setPendingEditorCanonicalDeck({}), false);
  assert.equal(bridge.getUndoDebounceTimer(), null);
  assert.equal(bridge.setUndoDebounceTimer(null), false);
});

test('editor loads the history bridge after its runtime dependency', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-history-bridge\.js"><\/script>/
  );
  assert.match(
    fileContent,
    /createStudioEditorShellStateComposition\(/
  );
  assert.match(fileContent, /studioEditorHistoryBridge/);
});
