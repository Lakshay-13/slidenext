const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const accessorsApi = require('../shared/studio-editor-history-accessors.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');
const ACCESSORS_PATH = path.join(__dirname, '..', 'shared', 'studio-editor-history-accessors.js');

test('history accessors delegate all history state operations', () => {
  const documentRef = { id: 'editor-document' };
  const bridge = {
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
  const accessors = accessorsApi.createStudioEditorHistoryAccessors({ bridge });

  assert.deepEqual(accessors.getUndoStack(), ['undo']);
  assert.deepEqual(accessors.getRedoStack(), ['redo']);
  assert.deepEqual(accessors.setUndoStack(['next-undo']), ['next-undo']);
  assert.deepEqual(accessors.setRedoStack(['next-redo']), ['next-redo']);
  assert.equal(accessors.clearHistoryStacks(), true);
  assert.deepEqual(accessors.getPendingEditorTransaction(), { id: 'tx' });
  assert.deepEqual(accessors.setPendingEditorTransaction({ id: 'next-tx' }), { id: 'next-tx' });
  assert.equal(accessors.clearPendingEditorTransaction(), true);
  assert.deepEqual(accessors.getPendingEditorCanonicalDeck(documentRef), { kind: 'slidenext.deck' });
  assert.deepEqual(accessors.setPendingEditorCanonicalDeck({ id: 'next-deck' }), {
    id: 'next-deck'
  });
  assert.equal(accessors.getUndoDebounceTimer(), 10);
  assert.equal(accessors.setUndoDebounceTimer(20), 20);
});

test('history accessors preserve safe fallbacks without a bridge', () => {
  const accessors = accessorsApi.createStudioEditorHistoryAccessors();

  assert.deepEqual(accessors.getUndoStack(), []);
  assert.deepEqual(accessors.getRedoStack(), []);
  assert.equal(accessors.setUndoStack([]), false);
  assert.equal(accessors.setRedoStack([]), false);
  assert.equal(accessors.clearHistoryStacks(), false);
  assert.equal(accessors.getPendingEditorTransaction(), null);
  assert.equal(accessors.setPendingEditorTransaction({}), false);
  assert.equal(accessors.clearPendingEditorTransaction(), false);
  assert.equal(accessors.getPendingEditorCanonicalDeck(), null);
  assert.equal(accessors.setPendingEditorCanonicalDeck({}), false);
  assert.equal(accessors.getUndoDebounceTimer(), null);
  assert.equal(accessors.setUndoDebounceTimer(null), false);
});

test('history global api preserves the editor shell function names', () => {
  const documentRef = { id: 'editor-document' };
  const calls = [];
  const accessors = {
    getUndoStack: () => ['undo'],
    getRedoStack: () => ['redo'],
    setUndoStack: (value) => value,
    setRedoStack: (value) => value,
    clearHistoryStacks: () => true,
    getPendingEditorTransaction: () => ({ id: 'tx' }),
    setPendingEditorTransaction: (value) => value,
    clearPendingEditorTransaction: () => {
      calls.push('clear-transaction');
      return true;
    },
    getPendingEditorCanonicalDeck: (sourceDocument) => {
      assert.equal(sourceDocument, documentRef);
      return { id: 'deck' };
    },
    setPendingEditorCanonicalDeck: (value) => value,
    getUndoDebounceTimer: () => 10,
    setUndoDebounceTimer: (value) => value
  };
  const globalApi = accessorsApi.createStudioEditorHistoryGlobalApi({ accessors });

  assert.deepEqual(globalApi.getStudioUndoStack(), ['undo']);
  assert.deepEqual(globalApi.getStudioRedoStack(), ['redo']);
  assert.deepEqual(globalApi.setStudioUndoStack(['next-undo']), ['next-undo']);
  assert.deepEqual(globalApi.setStudioRedoStack(['next-redo']), ['next-redo']);
  assert.equal(globalApi.clearStudioHistoryStacks(), true);
  assert.deepEqual(globalApi.getStudioPendingEditorTransaction(), { id: 'tx' });
  assert.deepEqual(globalApi.setStudioPendingEditorTransaction({ id: 'next-tx' }), {
    id: 'next-tx'
  });
  assert.equal(globalApi.clearStudioPendingEditorTransaction(), true);
  assert.deepEqual(globalApi.getStudioPendingEditorCanonicalDeck(documentRef), { id: 'deck' });
  assert.deepEqual(globalApi.setStudioPendingEditorCanonicalDeck({ id: 'next-deck' }), {
    id: 'next-deck'
  });
  assert.equal(globalApi.getStudioUndoDebounceTimer(), 10);
  assert.equal(globalApi.setStudioUndoDebounceTimer(20), 20);
  assert.deepEqual(calls, ['clear-transaction']);
});

test('history accessors publish the global consumed by the editor shell', () => {
  const context = { globalThis: {} };
  vm.runInNewContext(fs.readFileSync(ACCESSORS_PATH, 'utf8'), context);

  assert.equal(typeof context.globalThis.SlideNextStudioEditorHistoryAccessors, 'object');
  assert.equal(
    typeof context.globalThis.SlideNextStudioEditorHistoryAccessors
      .createStudioEditorHistoryAccessors,
    'function'
  );
  assert.equal(
    typeof context.globalThis.SlideNextStudioEditorHistoryAccessors
      .createStudioEditorHistoryGlobalApi,
    'function'
  );
});

test('editor loads history accessors after the history bridge', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-history-accessors\.js"><\/script>/
  );
  assert.match(fileContent, /studioEditorShellStateRuntime\.historyAccessors/);
  assert.match(fileContent, /studioEditorHistoryAccessors/);
  assert.match(fileContent, /Object\.assign\(globalThis, studioEditorHistoryGlobalApi\)/);
  assert.doesNotMatch(fileContent, /function getStudioUndoStack\(\)/);
  assert.doesNotMatch(fileContent, /function getStudioPendingEditorTransaction\(\)/);
});
