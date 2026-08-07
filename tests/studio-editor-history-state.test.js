const test = require('node:test');
const assert = require('node:assert/strict');
const historyState = require('../shared/studio-editor-history-state.js');

test('createStudioEditorHistorySaveAdapter lazily creates and reuses the shared history handler', () => {
  let createCalls = 0;
  const delegatedCalls = [];
  const historyApi = {
    createStudioHistorySaveHandler(options) {
      createCalls += 1;
      return (...args) => {
        delegatedCalls.push([args, options]);
        return { didCapture: true };
      };
    }
  };
  const adapter = historyState.createStudioEditorHistorySaveAdapter({ historyApi });

  assert.deepEqual(adapter(true, { id: 'first' }), { didCapture: true });
  assert.deepEqual(adapter(false, { id: 'second' }, { kind: 'deck' }), { didCapture: true });
  assert.equal(createCalls, 1);
  assert.deepEqual(delegatedCalls.map(([args]) => args), [
    [true, { id: 'first' }],
    [false, { id: 'second' }, { kind: 'deck' }]
  ]);
});

test('createStudioEditorHistorySaveAdapter fails closed when shared history is unavailable', () => {
  const adapter = historyState.createStudioEditorHistorySaveAdapter({
    getTimer() {
      return 'existing-timer';
    }
  });

  assert.deepEqual(adapter(), {
    didCapture: false,
    nextTimer: 'existing-timer'
  });
});

test('createStudioEditorHistoryEntryBuilder reads pending canonical state for each entry', () => {
  const calls = [];
  let pendingCanonicalDeck = null;
  let pendingTransaction = null;
  const historyApi = {
    buildStudioHistoryEntry(doc, options) {
      const canonicalDeck = options.buildCanonicalDeck(doc);
      calls.push({ doc, canonicalDeck, transaction: options.transaction });
      return { canonicalDeck, transaction: options.transaction };
    }
  };
  const baseDeck = { kind: 'slidenext.deck', slides: [] };
  const overrideDeck = { kind: 'slidenext.deck', slides: [{ id: 'slide-1' }] };
  const builder = historyState.createStudioEditorHistoryEntryBuilder({
    historyApi,
    getPendingCanonicalDeck() {
      return pendingCanonicalDeck;
    },
    buildCanonicalDeck(doc, options) {
      return options && options.canonicalDeckOverride
        ? options.canonicalDeckOverride
        : baseDeck;
    },
    getPendingTransaction() {
      return pendingTransaction;
    }
  });

  pendingCanonicalDeck = overrideDeck;
  pendingTransaction = { id: 'transaction-1' };
  assert.deepEqual(builder('doc-1'), {
    canonicalDeck: overrideDeck,
    transaction: pendingTransaction
  });

  pendingCanonicalDeck = null;
  pendingTransaction = { id: 'transaction-2' };
  assert.deepEqual(builder('doc-2'), {
    canonicalDeck: baseDeck,
    transaction: pendingTransaction
  });
  assert.deepEqual(calls.map(({ doc, canonicalDeck, transaction }) => ({ doc, canonicalDeck, transaction })), [
    { doc: 'doc-1', canonicalDeck: overrideDeck, transaction: { id: 'transaction-1' } },
    { doc: 'doc-2', canonicalDeck: baseDeck, transaction: { id: 'transaction-2' } }
  ]);
});

test('createStudioEditorHistoryCaptureAdapter reuses the capturer and clears pending state', () => {
  let createCalls = 0;
  let clearCalls = 0;
  let undoStack = [];
  let redoStack = [];
  const capturedEntries = [];
  const historyApi = {
    createStudioHistoryStateCapturer(options) {
      createCalls += 1;
      return () => {
        const entry = options.createHistoryEntry();
        capturedEntries.push(entry);
        options.setUndoStack([...options.getUndoStack(), entry]);
        options.afterCapture();
        return {
          didCapture: true,
          undoStack: options.getUndoStack(),
          redoStack: options.getRedoStack(),
          historyEntry: entry
        };
      };
    }
  };
  const captureState = historyState.createStudioEditorHistoryCaptureAdapter({
    historyApi,
    createHistoryEntry() {
      return { id: capturedEntries.length + 1 };
    },
    getUndoStack() {
      return undoStack;
    },
    getRedoStack() {
      return redoStack;
    },
    setUndoStack(nextStack) {
      undoStack = nextStack;
    },
    setRedoStack(nextStack) {
      redoStack = nextStack;
    },
    clearPendingState() {
      clearCalls += 1;
    }
  });

  assert.equal(captureState().didCapture, true);
  assert.equal(captureState().didCapture, true);
  assert.equal(createCalls, 1);
  assert.equal(clearCalls, 2);
  assert.deepEqual(capturedEntries, [{ id: 1 }, { id: 2 }]);
  assert.deepEqual(undoStack, [{ id: 1 }, { id: 2 }]);
  assert.deepEqual(redoStack, []);
});
