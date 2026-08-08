const test = require('node:test');
const assert = require('node:assert/strict');
const canonicalState = require('../shared/studio-editor-canonical-state.js');
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
  const buildOptionsCalls = [];
  let pendingCanonicalDeck = null;
  let pendingTransaction = null;
  const historyApi = {
    buildStudioHistoryEntry(doc, options) {
      const canonicalDeck = options.buildCanonicalDeck(doc);
      calls.push({
        doc,
        canonicalDeck,
        transaction: options.transaction,
        preferCanonicalDeck: options.preferCanonicalDeck
      });
      return {
        canonicalDeck,
        transaction: options.transaction
      };
    }
  };
  const baseDeck = { kind: 'slidenext.deck', slides: [] };
  const overrideDeck = { kind: 'slidenext.deck', slides: [{ id: 'slide-1' }] };
  const builder = historyState.createStudioEditorHistoryEntryBuilder({
    historyApi,
    getPendingCanonicalDeck() {
      return pendingCanonicalDeck;
    },
    preferCanonicalDeck: true,
    buildCanonicalDeck(doc, options) {
      buildOptionsCalls.push(options);
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
  assert.deepEqual(buildOptionsCalls, [
    { canonicalDeckOverride: overrideDeck },
    { preferLiveCanonicalDeck: false }
  ]);
  assert.equal(calls[0].preferCanonicalDeck, true);
  assert.equal(calls[1].preferCanonicalDeck, true);
});

test('createStudioEditorHistoryEntryBuilder forwards a live baseline when pending canonical state is absent', () => {
  const canonicalDeckBaseline = { kind: 'slidenext.deck', slides: [] };
  let capturedOptions = null;
  const historyApi = {
    buildStudioHistoryEntry(_doc, options) {
      options.buildCanonicalDeck('history-doc');
      return { canonicalDeck: canonicalDeckBaseline };
    }
  };
  const builder = historyState.createStudioEditorHistoryEntryBuilder({
    historyApi,
    canonicalStateApi: canonicalState,
    getCanonicalDeckBaseline(sourceDoc) {
      assert.equal(sourceDoc, 'history-doc');
      return canonicalDeckBaseline;
    },
    buildCanonicalDeck(_doc, options) {
      capturedOptions = options;
      return canonicalDeckBaseline;
    }
  });

  builder('history-doc');

  assert.deepEqual(capturedOptions, {
    preferLiveCanonicalDeck: false,
    canonicalDeckBaseline
  });
});

test('createStudioEditorHistoryEntryBuilder ignores an invalid live baseline', () => {
  let capturedOptions = null;
  const historyApi = {
    buildStudioHistoryEntry(_doc, options) {
      options.buildCanonicalDeck('history-doc');
      return { canonicalDeck: null };
    }
  };
  const builder = historyState.createStudioEditorHistoryEntryBuilder({
    historyApi,
    canonicalStateApi: canonicalState,
    isCanonicalDeck(value) {
      return !!value && value.kind === 'slidenext.deck' && Array.isArray(value.slides);
    },
    getCanonicalDeckBaseline() {
      return { invalid: true };
    },
    buildCanonicalDeck(_sourceDoc, options) {
      capturedOptions = options;
      return { kind: 'slidenext.deck', slides: [] };
    }
  });

  builder({ id: 'history-doc' });

  assert.deepEqual(capturedOptions, { preferLiveCanonicalDeck: false });
});

test('createStudioEditorHistoryEntryBuilder forwards the canonical validator', () => {
  let receivedValidator = null;
  const isCanonicalDeck = () => true;
  const builder = historyState.createStudioEditorHistoryEntryBuilder({
    historyApi: {
      buildStudioHistoryEntry(_doc, options) {
        receivedValidator = options.isCanonicalDeck;
        return null;
      }
    },
    isCanonicalDeck,
    buildCanonicalDeck() {
      return { kind: 'slidenext.deck', slides: [] };
    }
  });

  assert.equal(builder('history-doc'), null);
  assert.equal(receivedValidator, isCanonicalDeck);
});

test('createStudioEditorHistoryEntryAdapter reuses the shared entry builder', () => {
  let createCalls = 0;
  let capturedOptions = null;
  const adapter = historyState.createStudioEditorHistoryEntryAdapter({
    historyStateApi: {
      createStudioEditorHistoryEntryBuilder(options) {
        createCalls += 1;
        capturedOptions = options;
        return doc => ({ doc, source: 'shared-builder' });
      }
    },
    historyApi: { id: 'history-api' },
    getPendingTransaction: () => ({ id: 'transaction-1' })
  });

  assert.deepEqual(adapter('doc-1'), { doc: 'doc-1', source: 'shared-builder' });
  assert.deepEqual(adapter('doc-2'), { doc: 'doc-2', source: 'shared-builder' });
  assert.equal(createCalls, 1);
  assert.equal(capturedOptions.historyApi.id, 'history-api');
  assert.equal(capturedOptions.getPendingTransaction().id, 'transaction-1');
  assert.equal('historyStateApi' in capturedOptions, false);
});

test('createStudioEditorHistoryEntryAdapter fails closed without a shared builder', () => {
  const adapter = historyState.createStudioEditorHistoryEntryAdapter();

  assert.equal(adapter('doc'), null);
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

test('createStudioEditorHistoryCaptureStateAdapter reuses the shared capture adapter', () => {
  let createCalls = 0;
  let capturedOptions = null;
  const adapter = historyState.createStudioEditorHistoryCaptureStateAdapter({
    historyStateApi: {
      createStudioEditorHistoryCaptureAdapter(options) {
        createCalls += 1;
        capturedOptions = options;
        return () => ({ didCapture: true, historyEntry: { id: 'entry-1' } });
      }
    },
    historyApi: { id: 'history-api' },
    getUndoStack: () => ['undo'],
    getRedoStack: () => ['redo']
  });

  assert.deepEqual(adapter(), { didCapture: true, historyEntry: { id: 'entry-1' } });
  assert.equal(createCalls, 1);
  assert.equal(capturedOptions.historyApi.id, 'history-api');
  assert.deepEqual(capturedOptions.getUndoStack(), ['undo']);
  assert.deepEqual(capturedOptions.getRedoStack(), ['redo']);
  assert.equal('historyStateApi' in capturedOptions, false);
});

test('createStudioEditorHistoryCaptureStateAdapter clears pending state in its fallback', () => {
  let clearCalls = 0;
  const adapter = historyState.createStudioEditorHistoryCaptureStateAdapter({
    getUndoStack: () => ['undo'],
    getRedoStack: () => ['redo'],
    clearPendingState() {
      clearCalls += 1;
    }
  });

  assert.deepEqual(adapter(), {
    didCapture: false,
    undoStack: ['undo'],
    redoStack: ['redo'],
    historyEntry: null
  });
  assert.equal(clearCalls, 1);
});

test('createStudioEditorHistoryStepAdapter builds independent undo and redo runners', () => {
  const createdSteps = [];
  const historyApi = {
    stepStudioHistoryUndo() {},
    stepStudioHistoryRedo() {},
    createStudioHistoryStepRunner(options) {
      createdSteps.push(options);
      return () => ({
        [options.didStepKey]: true,
        undoStack: options.getUndoStack(),
        redoStack: options.getRedoStack(),
        restoreEntry: null
      });
    }
  };
  const undoStack = ['undo-entry'];
  const redoStack = ['redo-entry'];
  const adapter = historyState.createStudioEditorHistoryStepAdapter({
    historyApi,
    getUndoStack: () => undoStack,
    getRedoStack: () => redoStack,
    flushPendingHistory() {}
  });

  assert.equal(adapter.undo().didUndo, true);
  assert.equal(adapter.undo().didUndo, true);
  assert.equal(adapter.redo().didRedo, true);
  assert.equal(adapter.redo().didRedo, true);
  assert.equal(createdSteps.length, 2);
  assert.equal(createdSteps[0].stepHistory, historyApi.stepStudioHistoryUndo);
  assert.equal(createdSteps[0].didStepKey, 'didUndo');
  assert.equal(createdSteps[1].stepHistory, historyApi.stepStudioHistoryRedo);
  assert.equal(createdSteps[1].didStepKey, 'didRedo');
  assert.equal(typeof createdSteps[0].flushPendingHistory, 'function');
  assert.equal(typeof createdSteps[1].flushPendingHistory, 'function');
});

test('createStudioEditorHistoryStepStateAdapter reuses the shared step adapter', () => {
  let createCalls = 0;
  let capturedOptions = null;
  const adapter = historyState.createStudioEditorHistoryStepStateAdapter({
    historyStateApi: {
      createStudioEditorHistoryStepAdapter(options) {
        createCalls += 1;
        capturedOptions = options;
        return { undo: () => ({ didUndo: true }), redo: () => ({ didRedo: true }) };
      }
    },
    historyApi: { id: 'history-api' },
    triggerAutoSave: () => {}
  });

  assert.deepEqual(adapter.undo(), { didUndo: true });
  assert.deepEqual(adapter.redo(), { didRedo: true });
  assert.equal(createCalls, 1);
  assert.equal(capturedOptions.historyApi.id, 'history-api');
  assert.equal(capturedOptions.triggerAutoSave instanceof Function, true);
  assert.equal('historyStateApi' in capturedOptions, false);
});

test('createStudioEditorHistoryStepStateAdapter fails closed without a shared step adapter', () => {
  assert.equal(historyState.createStudioEditorHistoryStepStateAdapter(), null);
});

test('createStudioEditorHistoryFrameHtmlBuilder preserves capture and fallback callbacks', () => {
  const calls = [];
  const doc = { id: 'iframe-doc' };
  const canonicalDeck = { kind: 'slidenext.deck', slides: [] };
  const builder = historyState.createStudioEditorHistoryFrameHtmlBuilder({
    historyApi: {
      buildStudioHistoryCaptureHtml(nextDoc, options) {
        calls.push(['capture', nextDoc, options]);
        return options.buildFallbackHtml(nextDoc);
      }
    },
    getHistoryOptions(options) {
      calls.push(['history-options', options]);
      return { chromeNodeIds: ['editor-overlay'] };
    },
    buildPersistableDeckHtml(nextDoc, options) {
      calls.push(['fallback', nextDoc, options]);
      return '<html>fallback</html>';
    }
  });

  assert.equal(builder(doc, { canonicalDeck }), '<html>fallback</html>');
  assert.deepEqual(calls.map(([name]) => name), ['history-options', 'capture', 'fallback']);
  assert.equal(calls[1][1], doc);
  assert.deepEqual(calls[1][2].frameOptions, { chromeNodeIds: ['editor-overlay'] });
  assert.equal(calls[1][2].canonicalDeck, canonicalDeck);
  assert.deepEqual(calls[2][2], { canonicalDeck });
});

test('createStudioEditorHistoryFrameHtmlStateAdapter reuses the shared frame builder', () => {
  let createCalls = 0;
  let capturedOptions = null;
  const adapter = historyState.createStudioEditorHistoryFrameHtmlStateAdapter({
    historyStateApi: {
      createStudioEditorHistoryFrameHtmlBuilder(options) {
        createCalls += 1;
        capturedOptions = options;
        return (doc) => `<history>${doc.id}</history>`;
      }
    },
    historyApi: { id: 'history-api' },
    buildPersistableDeckHtml: () => '<html>fallback</html>'
  });

  assert.equal(adapter({ id: 'doc-1' }), '<history>doc-1</history>');
  assert.equal(adapter({ id: 'doc-2' }), '<history>doc-2</history>');
  assert.equal(createCalls, 1);
  assert.equal(capturedOptions.historyApi.id, 'history-api');
  assert.equal(capturedOptions.buildPersistableDeckHtml(), '<html>fallback</html>');
  assert.equal('historyStateApi' in capturedOptions, false);
});

test('createStudioEditorHistoryFrameHtmlStateAdapter fails closed without a shared builder', () => {
  assert.equal(historyState.createStudioEditorHistoryFrameHtmlStateAdapter(), null);
});
