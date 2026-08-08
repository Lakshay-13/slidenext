const test = require('node:test');
const assert = require('node:assert/strict');

const studioHistory = require('../shared/studio-history.js');

function createHistoryClassList(initialValues = []) {
  const values = new Set(initialValues);
  return {
    remove(...entries) {
      entries.forEach((entry) => values.delete(entry));
    },
    toString() {
      return Array.from(values).join(' ');
    }
  };
}

function createHistorySerializableNode(tagName, attributes = {}, classNames = [], children = [], textContent = '') {
  const nextAttributes = { ...attributes };
  const node = {
    removed: false,
    classList: createHistoryClassList(classNames),
    remove() {
      this.removed = true;
    },
    removeAttribute(name) {
      delete nextAttributes[name];
    },
    serialize() {
      if (this.removed) return '';
      const classes = this.classList.toString();
      const attrEntries = Object.entries({
        ...nextAttributes,
        ...(classes ? { class: classes } : {})
      });
      const serializedAttrs = attrEntries.length === 0
        ? ''
        : ' ' + attrEntries.map(([name, value]) => `${name}="${value}"`).join(' ');
      const serializedChildren = children.map((child) => child.serialize()).join('');
      return `<${tagName}${serializedAttrs}>${textContent}${serializedChildren}</${tagName}>`;
    }
  };
  return node;
}

test('createStudioHistoryEntry includes the canonical deck sidecar when provided', () => {
  const doc = { id: 'doc' };
  const canonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: [{ id: 'slide-1', nodes: [] }]
  };

  const entry = studioHistory.createStudioHistoryEntry(doc, {
    buildHistoryHtml() {
      return '<html></html>';
    },
    getActiveSlideId() {
      return 'slide-1';
    },
    getSelectedElementIds() {
      return ['node-1'];
    },
    canonicalDeck
  });

  assert.deepEqual(entry, {
    html: '',
    activeSlideId: 'slide-1',
    selectedElementIds: ['node-1'],
    canonicalDeck
  });
});

test('createStudioHistoryEntry preserves optional transaction metadata', () => {
  const transaction = {
    kind: 'slidenext.editor.transaction',
    version: 1,
    operations: [{
      type: 'style',
      elementId: 'node-1',
      before: { left: '0px' },
      after: { left: '10px' }
    }]
  };

  const entry = studioHistory.createStudioHistoryEntry(null, {
    buildHistoryHtml() {
      return '<main>transaction-state</main>';
    },
    activeSlideId: 'slide-1',
    selectedElementIds: [],
    transaction
  });

  assert.deepEqual(entry.transaction, transaction);
  assert.deepEqual(studioHistory.normalizeStudioHistoryEntry(entry), entry);
});

test('createStudioHistoryEntry makes canonical transaction entries model-first without building HTML', () => {
  const canonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: [{ id: 'slide-1', nodes: [] }]
  };
  const transaction = {
    kind: 'slidenext.editor.transaction',
    version: 1,
    operations: [{
      type: 'markup',
      elementId: 'slide:slide-1',
      before: '<p>Before</p>',
      after: '<p>After</p>'
    }]
  };
  let buildHistoryHtmlCalls = 0;

  const entry = studioHistory.createStudioHistoryEntry({ id: 'doc' }, {
    canonicalDeck,
    transaction,
    buildHistoryHtml() {
      buildHistoryHtmlCalls += 1;
      return '<html>should not be serialized</html>';
    },
    getActiveSlideId() {
      return 'slide-1';
    },
    getSelectedElementIds() {
      return [];
    }
  });

  assert.equal(buildHistoryHtmlCalls, 0);
  assert.deepEqual(entry, {
    html: '',
    activeSlideId: 'slide-1',
    selectedElementIds: [],
    canonicalDeck,
    transaction
  });
});

test('createStudioHistoryEntry can prefer canonical history without a transaction', () => {
  const canonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: [{ id: 'slide-1', nodes: [] }]
  };
  let buildHistoryHtmlCalls = 0;

  const entry = studioHistory.createStudioHistoryEntry({ id: 'doc' }, {
    canonicalDeck,
    preferCanonicalDeck: true,
    buildHistoryHtml() {
      buildHistoryHtmlCalls += 1;
      return '<html>should not be serialized</html>';
    },
    getActiveSlideId() {
      return 'slide-1';
    },
    getSelectedElementIds() {
      return [];
    }
  });

  assert.equal(buildHistoryHtmlCalls, 0);
  assert.deepEqual(entry, {
    html: '',
    activeSlideId: 'slide-1',
    selectedElementIds: [],
    canonicalDeck
  });
});

test('createStudioHistoryEntry can capture a model-only history entry without a live document', () => {
  const canonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: [{ id: 'slide-1', nodes: [] }]
  };

  const entry = studioHistory.createStudioHistoryEntry(null, {
    buildHistoryHtml() {
      return '<!DOCTYPE html><html><head><title>Persisted</title></head><body><main>persisted-baseline</main></body></html>';
    },
    activeSlideId: 'slide-1',
    selectedElementIds: ['node-1', ''],
    canonicalDeck
  });

  assert.deepEqual(entry, {
    html: '<head><title>Persisted</title></head><body><main>persisted-baseline</main></body>',
    activeSlideId: 'slide-1',
    selectedElementIds: ['node-1'],
    canonicalDeck
  });
});

test('createStudioHistoryEntry normalizes duplicate model-only selection ids', () => {
  const entry = studioHistory.createStudioHistoryEntry(null, {
    activeSlideId: 'slide-1',
    selectedElementIds: [' node-1 ', 'node-1', '', 'node-2', 'node-2'],
    canonicalDeck: { kind: 'slidenext.deck', schemaVersion: 1, slides: [] }
  });

  assert.deepEqual(entry.selectedElementIds, ['node-1', 'node-2']);
});

test('createStudioHistoryEntry normalizes duplicate live selection ids', () => {
  const entry = studioHistory.createStudioHistoryEntry({ id: 'doc' }, {
    getSelectedElementIds() {
      return [' node-1 ', 'node-1', '', 'node-2', 'node-2'];
    },
    canonicalDeck: { kind: 'slidenext.deck', schemaVersion: 1, slides: [] }
  });

  assert.deepEqual(entry.selectedElementIds, ['node-1', 'node-2']);
});

test('buildStudioHistoryEntry resolves live editor history state before delegating to entry creation', () => {
  const doc = { id: 'doc' };
  const canonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: [{ id: 'slide-1', nodes: [] }]
  };
  const transaction = {
    kind: 'slidenext.editor.transaction',
    version: 1,
    operations: [{
      type: 'style',
      elementId: 'node-1',
      before: { left: '0px' },
      after: { left: '10px' }
    }]
  };
  const calls = [];

  const entry = studioHistory.buildStudioHistoryEntry(undefined, {
    getDocument() {
      calls.push(['getDocument']);
      return doc;
    },
    buildCanonicalDeck(nextDoc) {
      calls.push(['buildCanonicalDeck', nextDoc]);
      return canonicalDeck;
    },
    getHistoryOptions() {
      calls.push(['getHistoryOptions']);
      return { chromeNodeIds: ['editorSelectionOverlay'] };
    },
    buildHistoryHtml(nextDoc) {
      calls.push(['buildHistoryHtml', nextDoc]);
      return '<html></html>';
    },
    getActiveSlideId(nextDoc) {
      calls.push(['getActiveSlideId', nextDoc]);
      return 'slide-1';
    },
    getSelectedElementIds(nextDoc) {
      calls.push(['getSelectedElementIds', nextDoc]);
      return ['node-1'];
    },
    transaction
  });

  assert.deepEqual(calls, [
    ['getDocument'],
    ['buildCanonicalDeck', doc],
    ['getHistoryOptions'],
    ['getActiveSlideId', doc],
    ['getSelectedElementIds', doc]
  ]);
  assert.deepEqual(entry, {
    html: '',
    activeSlideId: 'slide-1',
    selectedElementIds: ['node-1'],
    canonicalDeck,
    transaction
  });
});

test('buildStudioHistoryEntry falls back to HTML when canonical rebuild fails', () => {
  const doc = { id: 'legacy-doc' };
  const entry = studioHistory.buildStudioHistoryEntry(doc, {
    buildCanonicalDeck() {
      throw new Error('unsupported legacy markup');
    },
    buildHistoryHtml(nextDoc) {
      assert.equal(nextDoc, doc);
      return '<!DOCTYPE html><html><body><main>legacy</main></body></html>';
    },
    getActiveSlideId() {
      return 'slide-legacy';
    },
    getSelectedElementIds() {
      return ['node-legacy'];
    }
  });

  assert.deepEqual(entry, {
    html: '<body><main>legacy</main></body>',
    activeSlideId: 'slide-legacy',
    selectedElementIds: ['node-legacy'],
    canonicalDeck: null
  });
});

test('buildStudioHistoryEntry keeps model-only transaction metadata', () => {
  const canonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: [{ id: 'slide-1', nodes: [] }]
  };
  const transaction = {
    kind: 'slidenext.editor.transaction',
    version: 1,
    operations: [{
      type: 'markup',
      elementId: 'slide:slide-1',
      before: '<p>Before</p>',
      after: '<p>After</p>'
    }]
  };

  const entry = studioHistory.buildStudioHistoryEntry(null, {
    buildCanonicalDeck() {
      return canonicalDeck;
    },
    resolveFallbackActiveSlideId() {
      return 'slide-1';
    },
    transaction
  });

  assert.deepEqual(entry, {
    html: '',
    activeSlideId: 'slide-1',
    selectedElementIds: [],
    canonicalDeck,
    transaction
  });
});

test('buildStudioHistoryEntry resolves fallback active slide ids for model-only history entries', () => {
  const canonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: [{ id: 'slide-1', nodes: [] }]
  };
  const calls = [];

  const entry = studioHistory.buildStudioHistoryEntry(null, {
    getDocument() {
      calls.push(['getDocument']);
      return null;
    },
    buildCanonicalDeck(nextDoc) {
      calls.push(['buildCanonicalDeck', nextDoc]);
      return canonicalDeck;
    },
    getHistoryOptions() {
      calls.push(['getHistoryOptions']);
      return { chromeNodeIds: ['editorSelectionOverlay'] };
    },
    resolveFallbackActiveSlideId(nextDoc, nextCanonicalDeck) {
      calls.push(['resolveFallbackActiveSlideId', nextDoc, nextCanonicalDeck]);
      return 'slide-1';
    },
    buildHistoryHtml(nextDoc) {
      calls.push(['buildHistoryHtml', nextDoc]);
      return '<!DOCTYPE html><html><body><main>persisted</main></body></html>';
    },
    getActiveSlideId() {
      throw new Error('getActiveSlideId should not run without a live document');
    },
    getSelectedElementIds() {
      throw new Error('getSelectedElementIds should not run without a live document');
    }
  });

  assert.deepEqual(calls, [
    ['getDocument'],
    ['buildCanonicalDeck', null],
    ['getHistoryOptions'],
    ['resolveFallbackActiveSlideId', null, canonicalDeck],
    ['buildHistoryHtml', null]
  ]);
  assert.deepEqual(entry, {
    html: '<body><main>persisted</main></body>',
    activeSlideId: 'slide-1',
    selectedElementIds: [],
    canonicalDeck
  });
});

test('normalizeStudioHistoryEntry preserves the canonical deck sidecar', () => {
  const canonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: [{ id: 'slide-1', nodes: [] }]
  };

  assert.deepEqual(studioHistory.normalizeStudioHistoryEntry({
    html: '<!DOCTYPE html><html><head><title>History</title></head><body><main>snapshot</main></body></html>',
    activeSlideId: 'slide-1',
    selectedElementIds: ['node-1', '', null],
    canonicalDeck
  }), {
    html: '<head><title>History</title></head><body><main>snapshot</main></body>',
    activeSlideId: 'slide-1',
    selectedElementIds: ['node-1'],
    canonicalDeck
  });
});

test('history equality includes optional transaction metadata', () => {
  const baseEntry = {
    html: '<main>same</main>',
    activeSlideId: 'slide-1',
    selectedElementIds: [],
    canonicalDeck: null,
    transaction: {
      kind: 'slidenext.editor.transaction',
      version: 1,
      operations: [{ type: 'style', elementId: 'node-1', before: { left: '0px' }, after: { left: '10px' } }]
    }
  };

  assert.equal(studioHistory.areStudioHistoryEntriesEqual(baseEntry, { ...baseEntry }), true);
  assert.equal(studioHistory.areStudioHistoryEntriesEqual(baseEntry, {
    ...baseEntry,
    transaction: { ...baseEntry.transaction, operations: [] }
  }), false);
});

test('captureStudioHistoryState ignores equivalent full-document and inner-html history snapshots', () => {
  const initialEntry = {
    html: '<!DOCTYPE html><html><head><title>Deck</title></head><body><main>same</main></body></html>',
    activeSlideId: 'slide-1',
    selectedElementIds: ['node-1'],
    canonicalDeck: {
      kind: 'slidenext.deck',
      schemaVersion: 1,
      slides: [{ id: 'slide-1', nodes: [] }]
    }
  };
  const nextEntry = {
    html: '<head><title>Deck</title></head><body><main>same</main></body>',
    activeSlideId: 'slide-1',
    selectedElementIds: ['node-1'],
    canonicalDeck: initialEntry.canonicalDeck
  };

  const result = studioHistory.captureStudioHistoryState([initialEntry], [], nextEntry);

  assert.equal(result.didCapture, false);
  assert.equal(result.undoStack.length, 1);
  assert.deepEqual(result.undoStack[0], initialEntry);
  assert.deepEqual(result.redoStack, []);
});

test('captureStudioHistoryState keeps model-only history changes when the canonical deck sidecar differs', () => {
  const initialEntry = {
    html: '<html></html>',
    activeSlideId: 'slide-1',
    selectedElementIds: ['node-1'],
    canonicalDeck: {
      kind: 'slidenext.deck',
      schemaVersion: 1,
      slides: [{ id: 'slide-1', nodes: [] }]
    }
  };
  const nextEntry = {
    html: '<html></html>',
    activeSlideId: 'slide-1',
    selectedElementIds: ['node-1'],
    canonicalDeck: {
      kind: 'slidenext.deck',
      schemaVersion: 1,
      slides: [{ id: 'slide-1', nodes: [{ id: 'node-1' }] }]
    }
  };

  const result = studioHistory.captureStudioHistoryState([initialEntry], [], nextEntry);

  assert.equal(result.didCapture, true);
  assert.equal(result.undoStack.length, 2);
  assert.deepEqual(result.undoStack[1], {
    html: '',
    activeSlideId: 'slide-1',
    selectedElementIds: ['node-1'],
    canonicalDeck: nextEntry.canonicalDeck
  });
  assert.deepEqual(result.redoStack, []);
});

test('captureStudioHistoryState stores normalized history entries in the undo stack', () => {
  const nextEntry = {
    html: '<!DOCTYPE html><html><head><title>Deck</title></head><body><main>normalized</main></body></html>',
    activeSlideId: 'slide-1',
    selectedElementIds: ['node-1', '', null],
    canonicalDeck: {
      kind: 'slidenext.deck',
      schemaVersion: 1,
      slides: [{ id: 'slide-1', nodes: [] }]
    }
  };

  const result = studioHistory.captureStudioHistoryState([], [], nextEntry);

  assert.equal(result.didCapture, true);
  assert.equal(result.undoStack.length, 1);
  assert.deepEqual(result.undoStack[0], {
    html: '<head><title>Deck</title></head><body><main>normalized</main></body>',
    activeSlideId: 'slide-1',
    selectedElementIds: ['node-1'],
    canonicalDeck: nextEntry.canonicalDeck
  });
  assert.deepEqual(result.redoStack, []);
});

test('createStudioHistoryStateCapturer updates history stacks only when a new entry is captured', () => {
  const calls = [];
  let undoStack = [];
  let redoStack = ['redo-entry'];
  const historyEntry = { html: '<html></html>' };
  const capturer = studioHistory.createStudioHistoryStateCapturer({
    createHistoryEntry() {
      calls.push(['createHistoryEntry']);
      return historyEntry;
    },
    getUndoStack() {
      calls.push(['getUndoStack']);
      return undoStack;
    },
    getRedoStack() {
      calls.push(['getRedoStack']);
      return redoStack;
    },
    getHistoryStateOptions() {
      calls.push(['getHistoryStateOptions']);
      return { limit: 50 };
    },
    captureHistoryState(nextUndoStack, nextRedoStack, nextHistoryEntry, options) {
      calls.push(['captureHistoryState', nextUndoStack, nextRedoStack, nextHistoryEntry, options]);
      return {
        didCapture: true,
        undoStack: ['undo-entry'],
        redoStack: []
      };
    },
    setUndoStack(nextUndoStack) {
      calls.push(['setUndoStack', nextUndoStack]);
      undoStack = nextUndoStack;
    },
    setRedoStack(nextRedoStack) {
      calls.push(['setRedoStack', nextRedoStack]);
      redoStack = nextRedoStack;
    },
    updateHistoryButtons() {
      calls.push(['updateHistoryButtons']);
    }
  });

  assert.deepEqual(capturer(), {
    didCapture: true,
    undoStack: ['undo-entry'],
    redoStack: [],
    historyEntry
  });
  assert.deepEqual(undoStack, ['undo-entry']);
  assert.deepEqual(redoStack, []);
  assert.deepEqual(calls, [
    ['createHistoryEntry'],
    ['getUndoStack'],
    ['getRedoStack'],
    ['getHistoryStateOptions'],
    ['captureHistoryState', [], ['redo-entry'], historyEntry, { limit: 50 }],
    ['setUndoStack', ['undo-entry']],
    ['setRedoStack', []],
    ['updateHistoryButtons']
  ]);
});

test('createStudioHistorySaveHandler merges transactions and schedules history capture', () => {
  const transactionCalls = [];
  const transactionApi = {
    normalizeStudioEditorTransaction(transaction) {
      transactionCalls.push(['normalize', transaction]);
      return { ...transaction, normalized: true };
    },
    mergeStudioEditorTransactions(first, second) {
      transactionCalls.push(['merge', first, second]);
      return { first, second, merged: true };
    }
  };
  const scheduledCalls = [];
  let pendingTransaction = { id: 'pending' };
  let pendingCanonicalDeck = null;
  let liveCanonicalDeck = null;
  let timer = 'old-timer';
  let captureCalls = 0;
  const saveHistoryState = studioHistory.createStudioHistorySaveHandler({
    transactionApi,
    getPendingTransaction() {
      return pendingTransaction;
    },
    setPendingTransaction(nextTransaction) {
      pendingTransaction = nextTransaction;
    },
    setPendingCanonicalDeck(nextCanonicalDeck) {
      pendingCanonicalDeck = nextCanonicalDeck;
    },
    setLiveCanonicalDeck(nextCanonicalDeck) {
      liveCanonicalDeck = nextCanonicalDeck;
    },
    getTimer() {
      return timer;
    },
    setTimer(nextTimer) {
      timer = nextTimer;
    },
    captureState() {
      captureCalls += 1;
    },
    scheduleCapture(currentTimer, debounce, captureState, options) {
      scheduledCalls.push([currentTimer, debounce, captureState, options]);
      captureState();
      return { nextTimer: 'new-timer', didCapture: true };
    }
  });

  const canonicalDeck = { kind: 'slidenext.deck', slides: [] };
  const result = saveHistoryState(false, { id: 'next' }, canonicalDeck);

  assert.deepEqual(result, { nextTimer: 'new-timer', didCapture: true });
  assert.equal(timer, 'new-timer');
  assert.equal(captureCalls, 1);
  assert.deepEqual(pendingTransaction, {
    first: { id: 'pending' },
    second: { id: 'next', normalized: true },
    merged: true
  });
  assert.equal(pendingCanonicalDeck, canonicalDeck);
  assert.equal(liveCanonicalDeck, canonicalDeck);
  assert.deepEqual(transactionCalls, [
    ['normalize', { id: 'next' }],
    ['merge', { id: 'pending' }, { id: 'next', normalized: true }]
  ]);
  assert.equal(scheduledCalls[0][0], 'old-timer');
  assert.equal(scheduledCalls[0][1], false);
});

test('scheduleStudioHistoryCapture cancels a pending debounce before an immediate capture', () => {
  const clearedTimers = [];
  let captureCalls = 0;
  let scheduleCalls = 0;

  const result = studioHistory.scheduleStudioHistoryCapture(
    'pending-timer',
    false,
    () => {
      captureCalls += 1;
    },
    {
      clearScheduledCapture(timer) {
        clearedTimers.push(timer);
      },
      scheduleCapture() {
        scheduleCalls += 1;
        return 'unexpected-timer';
      }
    }
  );

  assert.deepEqual(result, {
    nextTimer: null,
    didCapture: true
  });
  assert.deepEqual(clearedTimers, ['pending-timer']);
  assert.equal(captureCalls, 1);
  assert.equal(scheduleCalls, 0);
});

test('scheduleStudioHistoryCapture cancels a timer handle of zero', () => {
  const clearedTimers = [];

  const result = studioHistory.scheduleStudioHistoryCapture(
    0,
    false,
    () => {},
    {
      clearScheduledCapture(timer) {
        clearedTimers.push(timer);
      }
    }
  );

  assert.deepEqual(result, {
    nextTimer: null,
    didCapture: true
  });
  assert.deepEqual(clearedTimers, [0]);
});

test('createStudioHistorySaveHandler clears pending transactions when no transaction is provided', () => {
  let pendingTransaction = { id: 'pending' };
  let pendingCanonicalDeck = { kind: 'slidenext.deck', slides: [] };
  let liveCanonicalDeck = { kind: 'slidenext.deck', slides: [] };
  let scheduledCapture = false;
  const saveHistoryState = studioHistory.createStudioHistorySaveHandler({
    getPendingTransaction() {
      return pendingTransaction;
    },
    setPendingTransaction(nextTransaction) {
      pendingTransaction = nextTransaction;
    },
    setPendingCanonicalDeck(nextCanonicalDeck) {
      pendingCanonicalDeck = nextCanonicalDeck;
    },
    setLiveCanonicalDeck(nextCanonicalDeck) {
      liveCanonicalDeck = nextCanonicalDeck;
    },
    getTimer() {
      return null;
    },
    setTimer() {},
    captureState() {},
    scheduleCapture() {
      scheduledCapture = true;
      return { nextTimer: null, didCapture: true };
    }
  });

  saveHistoryState();

  assert.equal(pendingTransaction, null);
  assert.equal(pendingCanonicalDeck, null);
  assert.equal(liveCanonicalDeck, null);
  assert.equal(scheduledCapture, true);
});

test('createStudioHistorySaveHandler rejects malformed canonical sidecars while preserving transactions', () => {
  let pendingTransaction = null;
  let pendingCanonicalDeck = null;
  let liveCanonicalDeck = null;
  const saveHistoryState = studioHistory.createStudioHistorySaveHandler({
    isCanonicalDeck(deck) {
      return deck && deck.kind === 'slidenext.deck';
    },
    getPendingTransaction() {
      return pendingTransaction;
    },
    setPendingTransaction(nextTransaction) {
      pendingTransaction = nextTransaction;
    },
    setPendingCanonicalDeck(nextCanonicalDeck) {
      pendingCanonicalDeck = nextCanonicalDeck;
    },
    setLiveCanonicalDeck(nextCanonicalDeck) {
      liveCanonicalDeck = nextCanonicalDeck;
    },
    getTimer() {
      return null;
    },
    setTimer() {},
    captureState() {},
    scheduleCapture() {
      return { nextTimer: null, didCapture: true };
    }
  });

  const transaction = { kind: 'slidenext.editor.transaction', operations: [] };
  const result = saveHistoryState(false, transaction, { kind: 'invalid.deck' });

  assert.deepEqual(result, { nextTimer: null, didCapture: true });
  assert.deepEqual(pendingTransaction, transaction);
  assert.equal(pendingCanonicalDeck, null);
  assert.equal(liveCanonicalDeck, null);
});

test('restoreStudioHistoryTransaction delegates replay and post-apply synchronization', () => {
  const historyEntry = { canonicalDeck: { slides: [{ id: 'slide-1' }] } };
  const historyStep = {
    direction: 'undo',
    transaction: { kind: 'slidenext.editor.transaction', operations: [] }
  };
  const element = { id: 'element-1' };
  const calls = [];
  const visibilityState = () => {};
  const result = studioHistory.restoreStudioHistoryTransaction(historyEntry, historyStep, {
    transactionApi: {
      applyStudioEditorTransaction(transaction, direction, options) {
        assert.deepEqual(transaction, historyStep.transaction);
        assert.equal(direction, 'undo');
        assert.equal(options.getElementById('element-1'), element);
        assert.equal(options.applyVisibilityState, visibilityState);
        assert.equal(options.applyMarkupState(element, '<section>next</section>'), true);
        calls.push('apply');
        return { didApply: true, changedCount: 1 };
      }
    },
    getElementById(editorId) {
      assert.equal(editorId, 'element-1');
      return element;
    },
    applyVisibilityState: visibilityState,
    applyMarkupState(target, markup) {
      assert.equal(target, element);
      assert.equal(markup, '<section>next</section>');
      return true;
    },
    onApplied(transactionResult, nextHistoryEntry) {
      assert.deepEqual(transactionResult, { didApply: true, changedCount: 1 });
      assert.equal(nextHistoryEntry, historyEntry);
      calls.push('onApplied');
      return { didRestoreTransaction: true, transactionResult };
    }
  });

  assert.deepEqual(result, {
    didRestoreTransaction: true,
    transactionResult: { didApply: true, changedCount: 1 }
  });
  assert.deepEqual(calls, ['apply', 'onApplied']);
  assert.equal(studioHistory.restoreStudioHistoryTransaction(historyEntry, null, {
    transactionApi: { applyStudioEditorTransaction() { throw new Error('should not apply'); } }
  }), null);
});

test('createStudioHistoryStateCapturer leaves history state unchanged when no entry is available or capture is skipped', () => {
  const missingEntryCapturer = studioHistory.createStudioHistoryStateCapturer({
    createHistoryEntry() {
      return null;
    },
    getUndoStack() {
      return ['undo-entry'];
    },
    getRedoStack() {
      return ['redo-entry'];
    },
    setUndoStack() {
      throw new Error('setUndoStack should not run when there is no history entry');
    },
    setRedoStack() {
      throw new Error('setRedoStack should not run when there is no history entry');
    },
    updateHistoryButtons() {
      throw new Error('updateHistoryButtons should not run when there is no history entry');
    }
  });

  assert.deepEqual(missingEntryCapturer(), {
    didCapture: false,
    undoStack: ['undo-entry'],
    redoStack: ['redo-entry'],
    historyEntry: null
  });

  let captureCalls = 0;
  const skippedCaptureCapturer = studioHistory.createStudioHistoryStateCapturer({
    createHistoryEntry() {
      return { html: '<html></html>' };
    },
    getUndoStack() {
      return ['undo-entry'];
    },
    getRedoStack() {
      return ['redo-entry'];
    },
    captureHistoryState() {
      captureCalls += 1;
      return {
        didCapture: false,
        undoStack: ['undo-entry'],
        redoStack: ['redo-entry']
      };
    },
    setUndoStack() {
      throw new Error('setUndoStack should not run when captureStudioHistoryState skips the entry');
    },
    setRedoStack() {
      throw new Error('setRedoStack should not run when captureStudioHistoryState skips the entry');
    },
    updateHistoryButtons() {
      throw new Error('updateHistoryButtons should not run when captureStudioHistoryState skips the entry');
    }
  });

  assert.deepEqual(skippedCaptureCapturer(), {
    didCapture: false,
    undoStack: ['undo-entry'],
    redoStack: ['redo-entry'],
    historyEntry: { html: '<html></html>' }
  });
  assert.equal(captureCalls, 1);
});

test('createStudioHistoryStateCapturer invokes afterCapture after a skipped capture', () => {
  let afterCaptureCalls = 0;
  const capturer = studioHistory.createStudioHistoryStateCapturer({
    createHistoryEntry() {
      return { html: '<html></html>' };
    },
    captureHistoryState() {
      return {
        didCapture: false,
        undoStack: ['undo-entry'],
        redoStack: ['redo-entry']
      };
    },
    afterCapture() {
      afterCaptureCalls += 1;
    }
  });

  capturer();
  assert.equal(afterCaptureCalls, 1);
});

test('createStudioHistoryButtonUpdater applies the computed history button state to the provided controls', () => {
  const undoButton = { disabled: false };
  const redoButton = { disabled: true };
  const calls = [];
  const updateHistoryButtons = studioHistory.createStudioHistoryButtonUpdater({
    getUndoStack() {
      calls.push(['getUndoStack']);
      return ['entry-1'];
    },
    getRedoStack() {
      calls.push(['getRedoStack']);
      return ['entry-2'];
    },
    getUndoButton() {
      calls.push(['getUndoButton']);
      return undoButton;
    },
    getRedoButton() {
      calls.push(['getRedoButton']);
      return redoButton;
    },
    getHistoryButtonState(undoStack, redoStack) {
      calls.push(['getHistoryButtonState', undoStack, redoStack]);
      return {
        undoDisabled: true,
        redoDisabled: false
      };
    }
  });

  assert.deepEqual(updateHistoryButtons(), {
    undoDisabled: true,
    redoDisabled: false
  });
  assert.equal(undoButton.disabled, true);
  assert.equal(redoButton.disabled, false);
  assert.deepEqual(calls, [
    ['getUndoStack'],
    ['getRedoStack'],
    ['getHistoryButtonState', ['entry-1'], ['entry-2']],
    ['getUndoButton'],
    ['getRedoButton']
  ]);
});

test('syncStudioHistoryButtons resolves editor controls from the document', () => {
  const buttons = {
    studioUndoBtn: { disabled: false },
    studioRedoBtn: { disabled: true }
  };
  const documentRef = {
    getElementById(id) {
      return buttons[id] || null;
    }
  };

  assert.deepEqual(studioHistory.syncStudioHistoryButtons({
    documentRef,
    undoStack: ['entry-1', 'entry-2'],
    redoStack: ['entry-3']
  }), {
    undoDisabled: false,
    redoDisabled: false
  });
  assert.equal(buttons.studioUndoBtn.disabled, false);
  assert.equal(buttons.studioRedoBtn.disabled, false);
});

test('createStudioHistoryStepRunner applies successful history steps and skips unsuccessful ones', () => {
  const calls = [];
  let undoStack = ['undo-entry'];
  let redoStack = ['redo-entry'];
  const restoreEntry = { html: '<html></html>' };
  const runHistoryStep = studioHistory.createStudioHistoryStepRunner({
    stepHistory(nextUndoStack, nextRedoStack) {
      calls.push(['stepHistory', nextUndoStack, nextRedoStack]);
      return {
        didUndo: true,
        undoStack: ['undo-next'],
        redoStack: ['redo-next'],
        restoreEntry
      };
    },
    didStepKey: 'didUndo',
    getUndoStack() {
      calls.push(['getUndoStack']);
      return undoStack;
    },
    getRedoStack() {
      calls.push(['getRedoStack']);
      return redoStack;
    },
    setUndoStack(nextUndoStack) {
      calls.push(['setUndoStack', nextUndoStack]);
      undoStack = nextUndoStack;
    },
    setRedoStack(nextRedoStack) {
      calls.push(['setRedoStack', nextRedoStack]);
      redoStack = nextRedoStack;
    },
    restoreHistoryEntry(nextRestoreEntry) {
      calls.push(['restoreHistoryEntry', nextRestoreEntry]);
    },
    updateHistoryButtons() {
      calls.push(['updateHistoryButtons']);
    },
    triggerAutoSave() {
      calls.push(['triggerAutoSave']);
    },
    flushPendingHistory() {
      calls.push(['flushPendingHistory']);
    }
  });

  assert.deepEqual(runHistoryStep(), {
    didUndo: true,
    undoStack: ['undo-next'],
    redoStack: ['redo-next'],
    restoreEntry
  });
  assert.deepEqual(undoStack, ['undo-next']);
  assert.deepEqual(redoStack, ['redo-next']);
  assert.deepEqual(calls, [
    ['flushPendingHistory'],
    ['getUndoStack'],
    ['getRedoStack'],
    ['stepHistory', ['undo-entry'], ['redo-entry']],
    ['setUndoStack', ['undo-next']],
    ['setRedoStack', ['redo-next']],
    ['restoreHistoryEntry', restoreEntry],
    ['updateHistoryButtons'],
    ['triggerAutoSave']
  ]);

  const skippedCalls = [];
  const skippedRunner = studioHistory.createStudioHistoryStepRunner({
    stepHistory(nextUndoStack, nextRedoStack) {
      skippedCalls.push(['stepHistory', nextUndoStack, nextRedoStack]);
      return {
        didUndo: false,
        undoStack: nextUndoStack,
        redoStack: nextRedoStack,
        restoreEntry: null
      };
    },
    didStepKey: 'didUndo',
    getUndoStack() {
      return ['undo-entry'];
    },
    getRedoStack() {
      return ['redo-entry'];
    },
    setUndoStack() {
      throw new Error('setUndoStack should not run when the history step is skipped');
    },
    setRedoStack() {
      throw new Error('setRedoStack should not run when the history step is skipped');
    },
    restoreHistoryEntry() {
      throw new Error('restoreHistoryEntry should not run when the history step is skipped');
    },
    updateHistoryButtons() {
      throw new Error('updateHistoryButtons should not run when the history step is skipped');
    },
    triggerAutoSave() {
      throw new Error('triggerAutoSave should not run when the history step is skipped');
    }
  });

  assert.deepEqual(skippedRunner(), {
    didUndo: false,
    undoStack: ['undo-entry'],
    redoStack: ['redo-entry'],
    restoreEntry: null
  });
  assert.deepEqual(skippedCalls, [
    ['stepHistory', ['undo-entry'], ['redo-entry']]
  ]);
});

test('history undo and redo steps carry transaction direction when present', () => {
  const transaction = {
    kind: 'slidenext.editor.transaction',
    version: 1,
    operations: [{ type: 'style', elementId: 'node-1', before: { left: '0px' }, after: { left: '10px' } }]
  };
  const undoState = studioHistory.stepStudioHistoryUndo([
    { html: '<main>initial</main>' },
    { html: '<main>next</main>', transaction }
  ], []);
  assert.deepEqual(undoState.transaction, { transaction, direction: 'undo' });

  const redoState = studioHistory.stepStudioHistoryRedo(undoState.undoStack, undoState.redoStack);
  assert.deepEqual(redoState.transaction, { transaction, direction: 'redo' });
});

test('buildStudioHistoryFrameHtml strips editor runtime ids from the captured html snapshot', () => {
  const runtimeNode = createHistorySerializableNode(
    'div',
    { 'data-editor-id': 'node-1' },
    ['editor-hoverable'],
    [],
    'Hero copy'
  );
  const slideNode = createHistorySerializableNode(
    'section',
    { 'data-slide-id': 'slide-runtime-1' },
    ['slide', 'editor-selected'],
    [runtimeNode]
  );
  const overlayNode = createHistorySerializableNode('div', { id: 'editorSelectionOverlay' });
  const clone = {
    querySelectorAll(selector) {
      switch (selector) {
        case '#editorSelectionOverlay':
          return [overlayNode];
        case '.editor-selected':
          return [slideNode];
        case '.editor-hoverable':
          return [runtimeNode];
        case '[data-editor-id]':
          return [runtimeNode];
        case '[data-slide-id]':
          return [slideNode];
        default:
          return [];
      }
    },
    get innerHTML() {
      return slideNode.serialize() + overlayNode.serialize();
    }
  };
  const doc = {
    documentElement: {
      cloneNode() {
        return clone;
      }
    }
  };

  const html = studioHistory.buildStudioHistoryFrameHtml(doc, {
    chromeNodeIds: ['editorSelectionOverlay'],
    removableClassNames: ['editor-selected', 'editor-hoverable'],
    editorElementIdAttr: 'data-editor-id',
    editorSlideIdAttr: 'data-slide-id'
  });

  assert.equal(html, '<section class="slide"><div>Hero copy</div></section>');
});

test('buildStudioHistoryFrameHtml runs the shared frame sanitizer before serializing history html', () => {
  const transientNode = createHistorySerializableNode(
    'div',
    { 'data-temp': 'runtime' },
    [],
    [],
    'Runtime state'
  );
  const clone = {
    querySelectorAll(selector) {
      if (selector === '[data-temp]') {
        return [transientNode];
      }
      return [];
    },
    get innerHTML() {
      return transientNode.serialize();
    }
  };
  const doc = {
    documentElement: {
      cloneNode() {
        return clone;
      }
    }
  };

  const html = studioHistory.buildStudioHistoryFrameHtml(doc, {
    sanitizeFrameRoot(root) {
      root.querySelectorAll('[data-temp]').forEach((node) => {
        node.removeAttribute('data-temp');
      });
    }
  });

  assert.equal(html, '<div>Runtime state</div>');
});

test('buildStudioHistoryCaptureHtml prefers live frame capture before falling back', () => {
  const clone = {
    querySelectorAll() {
      return [];
    },
    get innerHTML() {
      return '<section>live-history</section>';
    }
  };
  const doc = {
    documentElement: {
      cloneNode() {
        return clone;
      }
    }
  };
  let fallbackCalls = 0;

  const html = studioHistory.buildStudioHistoryCaptureHtml(doc, {
    buildFallbackHtml() {
      fallbackCalls += 1;
      return '<html>fallback-history</html>';
    }
  });

  assert.equal(html, '<section>live-history</section>');
  assert.equal(fallbackCalls, 0);
});

test('restoreStudioHistoryFrameSetup falls back to rendered canonical deck html when snapshot html is empty', () => {
  const canonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: [{ id: 'slide-1', nodes: [] }]
  };
  const doc = {
    documentElement: {
      innerHTML: ''
    }
  };
  const calls = [];

  const result = studioHistory.restoreStudioHistoryFrameSetup({
    html: '',
    activeSlideId: 'slide-2',
    canonicalDeck
  }, {
    doc,
    buildDeckSourceHtml(deck, options) {
      calls.push(['buildDeckSourceHtml', deck, options]);
      return '<!DOCTYPE html><html><head><style>.deck{}</style></head><body><main>rendered</main></body></html>';
    },
    replaceFrameHtml(nextDoc, html) {
      calls.push(['replaceFrameHtml', nextDoc, html]);
      nextDoc.documentElement.innerHTML = html;
    },
    syncIframeTheme(nextDoc) {
      calls.push(['syncIframeTheme', nextDoc]);
    },
    makeElementsHoverable(nextDoc) {
      calls.push(['makeElementsHoverable', nextDoc]);
    },
    setupIframeDragging(nextDoc) {
      calls.push(['setupIframeDragging', nextDoc]);
    },
    bindDeckNavigationSync(nextDoc) {
      calls.push(['bindDeckNavigationSync', nextDoc]);
    },
    generateThumbnails(nextDoc) {
      calls.push(['generateThumbnails', nextDoc]);
    }
  });

  assert.equal(doc.documentElement.innerHTML, '<head><style>.deck{}</style></head><body><main>rendered</main></body>');
  assert.deepEqual(calls.map(([name]) => name), [
    'buildDeckSourceHtml',
    'replaceFrameHtml',
    'syncIframeTheme',
    'makeElementsHoverable',
    'setupIframeDragging',
    'bindDeckNavigationSync',
    'generateThumbnails'
  ]);
  assert.equal(calls[0][1], canonicalDeck);
  assert.deepEqual(calls[0][2], {
    renderOptions: {
      preferSourceHtml: false,
      preferHeadSourceHtml: false,
      preferBodySourceHtml: false,
      preferSlideSourceHtml: false,
      preferNodeSourceHtml: false,
      activeSlideId: 'slide-2'
    }
  });
  assert.equal(calls[1][1], doc);
  assert.equal(calls[1][2], '<head><style>.deck{}</style></head><body><main>rendered</main></body>');
  assert.equal(result.didRestoreDoc, true);
  assert.equal(result.restoredHtmlLength, '<head><style>.deck{}</style></head><body><main>rendered</main></body>'.length);
});

test('restoreStudioHistoryFrameSetup preserves an explicit render active slide override over the history entry active slide', () => {
  const canonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: [{ id: 'slide-1', nodes: [] }, { id: 'slide-2', nodes: [] }]
  };
  const doc = {
    documentElement: {
      innerHTML: ''
    }
  };
  const calls = [];

  studioHistory.restoreStudioHistoryFrameSetup({
    html: '',
    activeSlideId: 'slide-2',
    canonicalDeck
  }, {
    doc,
    deckHtmlOptions: {
      renderOptions: {
        activeSlideId: 'slide-1'
      }
    },
    buildDeckSourceHtml(deck, options) {
      calls.push(['buildDeckSourceHtml', deck, options]);
      return '<html><body><main>rendered</main></body></html>';
    }
  });

  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0][2], {
    renderOptions: {
      preferSourceHtml: false,
      preferHeadSourceHtml: false,
      preferBodySourceHtml: false,
      preferSlideSourceHtml: false,
      preferNodeSourceHtml: false,
      activeSlideId: 'slide-1'
    }
  });
});

test('restoreStudioHistoryFrameSetup preserves explicit canonical render preference overrides over shared defaults', () => {
  const canonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: [{ id: 'slide-1', nodes: [] }]
  };
  const calls = [];

  studioHistory.restoreStudioHistoryFrameSetup({
    html: '',
    activeSlideId: 'slide-2',
    canonicalDeck
  }, {
    doc: {
      documentElement: {
        innerHTML: ''
      }
    },
    deckHtmlOptions: {
      renderOptions: {
        preferSourceHtml: true,
        preferNodeSourceHtml: true
      }
    },
    buildDeckSourceHtml(deck, options) {
      calls.push(['buildDeckSourceHtml', deck, options]);
      return '<html><body><main>rendered</main></body></html>';
    }
  });

  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0][2], {
    renderOptions: {
      preferSourceHtml: true,
      preferHeadSourceHtml: false,
      preferBodySourceHtml: false,
      preferSlideSourceHtml: false,
      preferNodeSourceHtml: true,
      activeSlideId: 'slide-2'
    }
  });
});

test('restoreStudioHistoryFrameSetup prefers captured history html over canonical deck fallback html', () => {
  let buildDeckSourceHtmlCalls = 0;
  const doc = {
    documentElement: {
      innerHTML: ''
    }
  };

  studioHistory.restoreStudioHistoryFrameSetup({
    html: '<!DOCTYPE html><html><head><title>Captured</title></head><body><main>captured</main></body></html>',
    canonicalDeck: {
      kind: 'slidenext.deck',
      schemaVersion: 1,
      slides: [{ id: 'slide-1', nodes: [] }]
    }
  }, {
    doc,
    buildDeckSourceHtml() {
      buildDeckSourceHtmlCalls += 1;
      return '<html>rendered</html>';
    }
  });

  assert.equal(doc.documentElement.innerHTML, '<head><title>Captured</title></head><body><main>captured</main></body>');
  assert.equal(buildDeckSourceHtmlCalls, 0);
});
