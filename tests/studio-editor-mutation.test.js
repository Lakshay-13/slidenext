const test = require('node:test');
const assert = require('node:assert/strict');

const mutation = require('../shared/studio-editor-mutation.js');

test('createStudioMutationFinalizer runs mutation side effects in a stable order', () => {
  const calls = [];
  const finalizeMutation = mutation.createStudioMutationFinalizer({
    syncSelectionOverlay() {
      calls.push('overlay');
    },
    generateThumbnails() {
      calls.push('thumbnails');
    },
    updateLayersList() {
      calls.push('layers');
    },
    saveHistoryState(debounce) {
      calls.push(['history', debounce]);
    },
    triggerAutoSave() {
      calls.push('save');
    },
    triggerAutoVersion(label) {
      calls.push(['version', label]);
    }
  });

  assert.equal(finalizeMutation('Auto: Moved Element', {
    syncSelectionOverlay: true,
    refreshLayersList: true,
    debounceHistory: true
  }), 'Auto: Moved Element');
  assert.deepEqual(calls, [
    'overlay',
    'thumbnails',
    'layers',
    ['history', true],
    'save',
    ['version', 'Auto: Moved Element']
  ]);
});

test('createStudioMutationFinalizer preserves persistence when thumbnail refresh throws', () => {
  const calls = [];
  const finalizeMutation = mutation.createStudioMutationFinalizer({
    generateThumbnails() {
      throw new Error('thumbnail refresh failed');
    },
    saveHistoryState() {
      calls.push('history');
    },
    triggerAutoSave() {
      calls.push('save');
    },
    triggerAutoVersion(label) {
      calls.push(['version', label]);
    }
  });

  assert.equal(finalizeMutation('Auto: Moved Element'), 'Auto: Moved Element');
  assert.deepEqual(calls, ['history', 'save', ['version', 'Auto: Moved Element']]);
});

test('createStudioMutationFinalizer preserves persistence when selection overlay refresh throws', () => {
  const calls = [];
  const finalizeMutation = mutation.createStudioMutationFinalizer({
    syncSelectionOverlay() {
      throw new Error('selection overlay unavailable');
    },
    saveHistoryState() {
      calls.push('history');
    },
    triggerAutoSave() {
      calls.push('save');
    },
    triggerAutoVersion(label) {
      calls.push(['version', label]);
    }
  });

  assert.equal(finalizeMutation('Auto: Moved Element', {
    syncSelectionOverlay: true
  }), 'Auto: Moved Element');
  assert.deepEqual(calls, ['history', 'save', ['version', 'Auto: Moved Element']]);
});

test('createStudioMutationFinalizer preserves persistence when layer refresh throws', () => {
  const calls = [];
  const finalizeMutation = mutation.createStudioMutationFinalizer({
    updateLayersList() {
      throw new Error('layer refresh unavailable');
    },
    saveHistoryState() {
      calls.push('history');
    },
    triggerAutoSave() {
      calls.push('save');
    },
    triggerAutoVersion(label) {
      calls.push(['version', label]);
    }
  });

  assert.equal(finalizeMutation('Auto: Moved Element', {
    refreshLayersList: true
  }), 'Auto: Moved Element');
  assert.deepEqual(calls, ['history', 'save', ['version', 'Auto: Moved Element']]);
});

test('createStudioMutationFinalizer forwards the mutation document to selection UI refreshes', () => {
  const documentRef = { id: 'editor-document' };
  const receivedDocuments = [];
  const finalizeMutation = mutation.createStudioMutationFinalizer({
    syncSelectionOverlay(doc) {
      receivedDocuments.push(['overlay', doc]);
    },
    updateLayersList(doc) {
      receivedDocuments.push(['layers', doc]);
    }
  });

  finalizeMutation('', {
    doc: documentRef,
    syncSelectionOverlay: true,
    refreshThumbnails: false,
    refreshLayersList: true
  });

  assert.deepEqual(receivedDocuments, [
    ['overlay', documentRef],
    ['layers', documentRef]
  ]);
});

test('createStudioMutationFinalizer honors refresh and version guards', () => {
  const calls = [];
  const finalizeMutation = mutation.createStudioMutationFinalizer({
    generateThumbnails() {
      calls.push('thumbnails');
    },
    updateLayersList() {
      calls.push('layers');
    },
    saveHistoryState() {
      calls.push('history');
    },
    triggerAutoSave() {
      calls.push('save');
    },
    triggerAutoVersion() {
      calls.push('version');
    }
  });

  assert.equal(finalizeMutation('', {
    refreshThumbnails: false,
    refreshLayersList: false
  }), '');
  assert.deepEqual(calls, ['history', 'save']);
});

test('createStudioMutationFinalizer forwards optional history transactions', () => {
  const transaction = { kind: 'slidenext.editor.transaction', version: 1, operations: [] };
  let historyArgs = null;
  const finalizeMutation = mutation.createStudioMutationFinalizer({
    saveHistoryState(...args) {
      historyArgs = args;
    }
  });

  finalizeMutation('', { debounceHistory: true, transaction });

  assert.deepEqual(historyArgs, [true, transaction]);
});

test('createStudioMutationFinalizer preserves an optional canonical deck history sidecar', () => {
  const canonicalDeck = { kind: 'slidenext.deck', slides: [] };
  let historyArgs = null;
  const finalizeMutation = mutation.createStudioMutationFinalizer({
    saveHistoryState(...args) {
      historyArgs = args;
    }
  });

  finalizeMutation('', {
    transaction: { id: 'tx-canonical' },
    canonicalDeck
  });

  assert.deepEqual(historyArgs, [false, { id: 'tx-canonical' }, canonicalDeck]);
});

test('createStudioMutationFinalizer publishes canonical state before dependent UI refreshes', () => {
  const canonicalDeck = { kind: 'slidenext.deck', slides: [] };
  const calls = [];
  const finalizeMutation = mutation.createStudioMutationFinalizer({
    syncSelectionOverlay() {
      calls.push('overlay');
    },
    generateThumbnails() {
      calls.push('thumbnails');
    },
    updateLayersList() {
      calls.push('layers');
    },
    saveHistoryState(...args) {
      calls.push(['history', ...args]);
    },
    triggerAutoSave() {
      calls.push('save');
    }
  });

  finalizeMutation('Auto: Canonical Update', {
    syncSelectionOverlay: true,
    refreshLayersList: true,
    transaction: { id: 'tx-canonical-order' },
    canonicalDeck
  });

  assert.deepEqual(calls, [
    ['history', false, { id: 'tx-canonical-order' }, canonicalDeck],
    'overlay',
    'thumbnails',
    'layers',
    'save'
  ]);
});

test('createStudioMutationFinalizer fails before UI work when canonical history rejects', () => {
  const calls = [];
  const canonicalDeck = { kind: 'slidenext.deck', slides: [] };
  const finalizeMutation = mutation.createStudioMutationFinalizer({
    syncSelectionOverlay() {
      calls.push('overlay');
    },
    generateThumbnails() {
      calls.push('thumbnails');
    },
    saveHistoryState(...args) {
      calls.push(['history', ...args]);
      return { didCapture: false };
    },
    triggerAutoSave() {
      calls.push('save');
    },
    triggerAutoVersion() {
      calls.push('version');
    }
  });

  assert.equal(finalizeMutation('Auto: Rejected Canonical Update', {
    syncSelectionOverlay: true,
    canonicalDeck
  }), false);
  assert.deepEqual(calls, [['history', false, null, canonicalDeck]]);
});

test('createStudioMutationFinalizer fails before UI work when history capture throws', () => {
  const calls = [];
  const canonicalDeck = { kind: 'slidenext.deck', slides: [] };
  const finalizeMutation = mutation.createStudioMutationFinalizer({
    syncSelectionOverlay() {
      calls.push('overlay');
    },
    generateThumbnails() {
      calls.push('thumbnails');
    },
    saveHistoryState() {
      calls.push('history');
      throw new Error('history unavailable');
    },
    triggerAutoSave() {
      calls.push('save');
    }
  });

  assert.equal(finalizeMutation('Auto: Rejected Update', {
    syncSelectionOverlay: true,
    canonicalDeck
  }), false);
  assert.deepEqual(calls, ['history']);
});

test('createStudioMutationFinalizer converts thrown autosave to rejection', () => {
  const calls = [];
  const finalizeMutation = mutation.createStudioMutationFinalizer({
    saveHistoryState() {
      calls.push('history');
    },
    triggerAutoSave() {
      throw new Error('autosave unavailable');
    },
    triggerAutoVersion() {
      throw new Error('versioning should not run');
    }
  });

  assert.equal(finalizeMutation('Auto: Rejected Update'), false);
  assert.deepEqual(calls, ['history']);
});

test('createStudioMutationFinalizer preserves the result when version notification throws', () => {
  const calls = [];
  const finalizeMutation = mutation.createStudioMutationFinalizer({
    saveHistoryState() {
      calls.push('history');
    },
    triggerAutoSave() {
      calls.push('save');
    },
    triggerAutoVersion() {
      throw new Error('version notification unavailable');
    }
  });

  assert.equal(finalizeMutation('Auto: Moved Element'), 'Auto: Moved Element');
  assert.deepEqual(calls, ['history', 'save']);
});

test('createStudioMutationFinalizer drops malformed canonical deck sidecars', () => {
  const historyArgs = [];
  const isCanonicalDeck = (value) => (
    !!value && value.kind === 'slidenext.deck' && Array.isArray(value.slides)
  );
  const finalizeMutation = mutation.createStudioMutationFinalizer({
    isCanonicalDeck,
    buildCanonicalDeck: () => ({ invalid: true }),
    saveHistoryState(...args) {
      historyArgs.push(args);
    }
  });

  finalizeMutation('Auto: Rebuilt', { transaction: { id: 'tx-rebuilt' } });
  finalizeMutation('Auto: Explicit', {
    transaction: { id: 'tx-explicit' },
    canonicalDeck: { invalid: true }
  });

  assert.deepEqual(historyArgs, [
    [false, { id: 'tx-rebuilt' }],
    [false, { id: 'tx-explicit' }]
  ]);
});

test('createStudioMutationFinalizer rejects malformed sidecars without a custom validator', () => {
  const historyArgs = [];
  const finalizeMutation = mutation.createStudioMutationFinalizer({
    buildCanonicalDeck: () => ({ invalid: true }),
    saveHistoryState(...args) {
      historyArgs.push(args);
    }
  });

  finalizeMutation('Auto: Rebuilt', { transaction: { id: 'tx-rebuilt' } });
  finalizeMutation('Auto: Explicit', {
    transaction: { id: 'tx-explicit' },
    canonicalDeck: { invalid: true }
  });

  assert.deepEqual(historyArgs, [
    [false, { id: 'tx-rebuilt' }],
    [false, { id: 'tx-explicit' }]
  ]);
});

test('createStudioMutationFinalizer resolves a canonical deck only when the mutation has no sidecar', () => {
  const calls = [];
  const canonicalDeck = { kind: 'slidenext.deck', slides: [{ id: 'slide-1' }] };
  const finalizeMutation = mutation.createStudioMutationFinalizer({
    buildCanonicalDeck() {
      calls.push(['buildCanonicalDeck']);
      return canonicalDeck;
    },
    saveHistoryState(...args) {
      calls.push(['history', ...args]);
    }
  });

  finalizeMutation('Auto: Styled Element', { transaction: { id: 'tx-1' } });
  finalizeMutation('Auto: Explicit Deck', {
    canonicalDeck: { kind: 'slidenext.deck', slides: [{ id: 'slide-2' }] }
  });

  assert.deepEqual(calls, [
    ['buildCanonicalDeck'],
    ['history', false, { id: 'tx-1' }, canonicalDeck],
    ['history', false, null, { kind: 'slidenext.deck', slides: [{ id: 'slide-2' }] }]
  ]);
});

test('createStudioMutationFinalizer prefers a dedicated canonical baseline builder', () => {
  const calls = [];
  const legacyDeck = { kind: 'slidenext.deck', slides: [{ id: 'legacy' }] };
  const baselineDeck = { kind: 'slidenext.deck', slides: [{ id: 'baseline' }] };
  const finalizeMutation = mutation.createStudioMutationFinalizer({
    buildCanonicalDeck() {
      calls.push('legacy');
      return legacyDeck;
    },
    buildCanonicalDeckBaseline() {
      calls.push('baseline');
      return baselineDeck;
    },
    saveHistoryState(...args) {
      calls.push(['history', ...args]);
    }
  });

  finalizeMutation('Auto: Styled Element', { transaction: { id: 'tx-baseline' } });

  assert.deepEqual(calls, [
    'baseline',
    ['history', false, { id: 'tx-baseline' }, baselineDeck]
  ]);
});

test('createStudioMutationFinalizer preserves mutation persistence when canonical rebuild fails', () => {
  const calls = [];
  const finalizeMutation = mutation.createStudioMutationFinalizer({
    buildCanonicalDeck() {
      throw new Error('unsupported legacy markup');
    },
    saveHistoryState(...args) {
      calls.push(['history', ...args]);
    },
    triggerAutoSave() {
      calls.push('save');
    }
  });

  assert.equal(finalizeMutation('Auto: Legacy Edit', { transaction: { id: 'tx-legacy' } }), 'Auto: Legacy Edit');
  assert.deepEqual(calls, [
    ['history', false, { id: 'tx-legacy' }],
    'save'
  ]);
});

test('finalizeStudioMutation delegates version and mutation options to the shared finalizer', () => {
  const calls = [];
  const result = mutation.finalizeStudioMutation({
    versionLabel: 'Auto: Updated Element',
    mutationOptions: {
      refreshThumbnails: false,
      transaction: { id: 'tx-1' }
    },
    saveHistoryState(...args) {
      calls.push(['history', ...args]);
    },
    triggerAutoSave() {
      calls.push(['save']);
    },
    triggerAutoVersion(label) {
      calls.push(['version', label]);
    }
  });

  assert.equal(result, 'Auto: Updated Element');
  assert.deepEqual(calls, [
    ['history', false, { id: 'tx-1' }],
    ['save'],
    ['version', 'Auto: Updated Element']
  ]);
});

test('finalizeStudioSelectionToggleMutation syncs selection before persisting a transaction', () => {
  const calls = [];
  const documentRef = { id: 'editor-document' };
  assert.equal(mutation.finalizeStudioSelectionToggleMutation({
    versionLabel: 'Auto: Locked Element',
    mutationOptions: {
      doc: documentRef,
      transaction: { id: 'tx-2' }
    },
    syncSelectionUi(doc) {
      calls.push(['selection', doc]);
    },
    finalizeMutation(label, options) {
      calls.push(['finalize', label, options]);
    }
  }), true);

  assert.deepEqual(calls, [
    ['selection', documentRef],
    ['finalize', 'Auto: Locked Element', {
      refreshThumbnails: false,
      transaction: { id: 'tx-2' }
    }]
  ]);
});

test('finalizeStudioSelectionToggleMutation propagates explicit persistence rejection', () => {
  let didSyncSelection = false;

  assert.equal(mutation.finalizeStudioSelectionToggleMutation({
    versionLabel: 'Auto: Locked Element',
    mutationOptions: { transaction: { id: 'tx-rejected' } },
    syncSelectionUi() {
      didSyncSelection = true;
    },
    finalizeMutation() {
      return false;
    }
  }), false);
  assert.equal(didSyncSelection, true);
});

test('finalizeStudioSelectionToggleMutation contains thrown persistence failures', () => {
  assert.equal(mutation.finalizeStudioSelectionToggleMutation({
    versionLabel: 'Auto: Locked Element',
    finalizeMutation: () => {
      throw new Error('selection finalization failed');
    }
  }), false);
});

test('finalizeStudioSelectionToggleMutation forwards a canonical history sidecar', () => {
  const canonicalDeck = { kind: 'slidenext.deck', slides: [] };
  let finalized = null;

  assert.equal(mutation.finalizeStudioSelectionToggleMutation({
    versionLabel: 'Auto: Locked Element',
    mutationOptions: {
      transaction: { id: 'tx-lock' },
      canonicalDeck
    },
    finalizeMutation(label, options) {
      finalized = { label, options };
    }
  }), true);

  assert.deepEqual(finalized, {
    label: 'Auto: Locked Element',
    options: {
      refreshThumbnails: false,
      transaction: { id: 'tx-lock' },
      canonicalDeck
    }
  });
});

test('finalizeStudioSelectionToggleMutation honors skipped selection UI', () => {
  const calls = [];
  assert.equal(mutation.finalizeStudioSelectionToggleMutation({
    versionLabel: 'Auto: Visibility Update',
    mutationOptions: {
      skipSelectionUi: true
    },
    syncSelectionUi() {
      calls.push('selection');
    },
    finalizeMutation() {
      calls.push('finalize');
    }
  }), true);
  assert.deepEqual(calls, ['finalize']);
});

test('finalizeStudioInsertedElements selects inserted elements before finalizing persistence', () => {
  const insertedElements = [{ id: 'node-1' }, { id: 'node-2' }];
  const nextSelectionState = { selectedElements: insertedElements, selectedElement: insertedElements[0] };
  const calls = [];

  assert.equal(mutation.finalizeStudioInsertedElements({
    insertedElements,
    versionLabel: 'Auto: Pasted Element',
    transaction: { id: 'tx-insert' },
    selectAllElements(elements) {
      calls.push(['selectAllElements', elements]);
      return nextSelectionState;
    },
    commitSelectionState(selectionState) {
      calls.push(['commitSelectionState', selectionState]);
    },
    finalizeMutation(label, options) {
      calls.push(['finalizeMutation', label, options]);
    }
  }), true);

  assert.deepEqual(calls, [
    ['selectAllElements', insertedElements],
    ['commitSelectionState', nextSelectionState],
    ['finalizeMutation', 'Auto: Pasted Element', { transaction: { id: 'tx-insert' } }]
  ]);
});

test('finalizeStudioInsertedElements forwards a canonical deck sidecar', () => {
  const canonicalDeck = { kind: 'slidenext.deck', slides: [] };
  let finalized = null;

  assert.equal(mutation.finalizeStudioInsertedElements({
    insertedElements: [{ id: 'node-1' }],
    versionLabel: 'Auto: Added H2',
    canonicalDeck,
    finalizeMutation(label, options) {
      finalized = { label, options };
    }
  }), true);

  assert.deepEqual(finalized, {
    label: 'Auto: Added H2',
    options: {
      transaction: undefined,
      canonicalDeck
    }
  });
});

test('finalizeStudioInsertedElements fails closed without persistence and propagates rejection', () => {
  const insertedElements = [{ id: 'node-1' }];
  let selected = 0;

  assert.equal(mutation.finalizeStudioInsertedElements({
    insertedElements,
    selectAllElements() {
      selected += 1;
      return { selectedElements: insertedElements };
    }
  }), false);
  assert.equal(selected, 0);

  assert.equal(mutation.finalizeStudioInsertedElements({
    insertedElements,
    finalizeMutation: () => false
  }), false);
});

test('finalizeStudioInsertedElements contains thrown persistence failures', () => {
  assert.equal(mutation.finalizeStudioInsertedElements({
    insertedElements: [{ id: 'node-1' }],
    finalizeMutation: () => {
      throw new Error('inserted element finalization failed');
    }
  }), false);
});

test('finalizeStudioSlideMutation forwards transaction and canonical deck persistence state', () => {
  const calls = [];
  const canonicalDeck = { kind: 'slidenext.deck', slides: [] };

  assert.equal(mutation.finalizeStudioSlideMutation({
    versionLabel: 'Auto: Added Slide',
    transaction: { id: 'tx-3' },
    canonicalDeck,
    saveHistoryState(...args) {
      calls.push(['history', ...args]);
    },
    triggerAutoSave() {
      calls.push(['save']);
    },
    triggerAutoVersion(label) {
      calls.push(['version', label]);
    }
  }), 'Auto: Added Slide');

  assert.deepEqual(calls, [
    ['history', false, { id: 'tx-3' }, canonicalDeck],
    ['save'],
    ['version', 'Auto: Added Slide']
  ]);
});

test('createStudioSlideMutationPersistenceFinalizer preserves slide persistence ordering', () => {
  const calls = [];
  const finalizeSlideMutation = mutation.createStudioSlideMutationPersistenceFinalizer({
    saveHistoryState(...args) {
      calls.push(['history', ...args]);
    },
    triggerAutoSave() {
      calls.push('save');
    },
    triggerAutoVersion(label) {
      calls.push(['version', label]);
    }
  });
  const transaction = { kind: 'slidenext.editor.transaction' };

  assert.equal(finalizeSlideMutation('Auto: Reordered Slides', transaction), 'Auto: Reordered Slides');
  assert.deepEqual(calls, [
    ['history', false, transaction],
    'save',
    ['version', 'Auto: Reordered Slides']
  ]);
});

test('createStudioSlideMutationPersistenceFinalizer skips empty version labels', () => {
  const calls = [];
  const finalizeSlideMutation = mutation.createStudioSlideMutationPersistenceFinalizer({
    saveHistoryState() {
      calls.push('history');
    },
    triggerAutoSave() {
      calls.push('save');
    },
    triggerAutoVersion() {
      calls.push('version');
    }
  });

  assert.equal(finalizeSlideMutation(''), '');
  assert.deepEqual(calls, ['history', 'save']);
});

test('createStudioSlideMutationPersistenceFinalizer forwards canonical deck overrides', () => {
  const canonicalDeck = { kind: 'slidenext.deck', schemaVersion: 1, slides: [] };
  let historyArgs = null;
  const finalizeSlideMutation = mutation.createStudioSlideMutationPersistenceFinalizer({
    saveHistoryState(...args) {
      historyArgs = args;
    }
  });

  finalizeSlideMutation('', null, canonicalDeck);

  assert.deepEqual(historyArgs, [false, null, canonicalDeck]);
});

test('createStudioSlideMutationPersistenceFinalizer propagates rejected history', () => {
  const finalizeSlideMutation = mutation.createStudioSlideMutationPersistenceFinalizer({
    saveHistoryState: () => {
      throw new Error('history unavailable');
    },
    triggerAutoSave: () => {
      throw new Error('autosave should not run');
    },
    triggerAutoVersion: () => {
      throw new Error('versioning should not run');
    }
  });

  assert.equal(finalizeSlideMutation('Auto: Rejected', { id: 'tx' }), false);
});

test('createStudioSlideMutationRestoreStateCapturer preserves view state after saving history', () => {
  const iframeDoc = { id: 'editor-doc' };
  const calls = [];
  const captureState = mutation.createStudioSlideMutationRestoreStateCapturer({
    saveHistoryState() {
      calls.push(['saveHistoryState']);
    },
    getActiveSlideId(doc) {
      calls.push(['getActiveSlideId', doc]);
      return 'slide-3';
    },
    getCommittedSelectedElementIds(doc) {
      calls.push(['getCommittedSelectedElementIds', doc]);
      return ['element-1'];
    }
  });

  assert.deepEqual(captureState(iframeDoc), {
    preservedActiveSlideId: 'slide-3',
    preservedSelectionIds: ['element-1']
  });
  assert.deepEqual(calls, [
    ['saveHistoryState'],
    ['getActiveSlideId', iframeDoc],
    ['getCommittedSelectedElementIds', iframeDoc]
  ]);
});

test('createStudioSlideMutationRestoreStateCapturer delegates to shared deck-view capture', () => {
  const iframeDoc = { id: 'editor-doc' };
  let delegatedOptions = null;
  const captureState = mutation.createStudioSlideMutationRestoreStateCapturer({
    captureStudioDeckViewBeforeSlideMutation(options) {
      delegatedOptions = options;
      return { preservedActiveSlideId: 'slide-4', preservedSelectionIds: ['element-4'] };
    },
    saveHistoryState() {},
    getActiveSlideId() {},
    getCommittedSelectedElementIds() {}
  });

  assert.deepEqual(captureState(iframeDoc), {
    preservedActiveSlideId: 'slide-4',
    preservedSelectionIds: ['element-4']
  });
  assert.equal(delegatedOptions.doc, iframeDoc);
});

test('createStudioSlideMutationRestoreStateCapturer records a canonical baseline before mutation', () => {
  const iframeDoc = { id: 'editor-doc' };
  const canonicalDeck = { kind: 'slidenext.deck', slides: [] };
  const calls = [];
  const captureState = mutation.createStudioSlideMutationRestoreStateCapturer({
    buildCanonicalDeck(doc, options) {
      calls.push(['buildCanonicalDeck', doc, options]);
      return canonicalDeck;
    },
    saveHistoryState(...args) {
      calls.push(['saveHistoryState', ...args]);
    },
    getActiveSlideId() {
      return 'slide-1';
    },
    getCommittedSelectedElementIds() {
      return [];
    }
  });

  captureState(iframeDoc);

  assert.deepEqual(calls, [
    ['buildCanonicalDeck', iframeDoc, { preferLiveCanonicalDeck: false }],
    ['saveHistoryState', false, null, canonicalDeck]
  ]);
});

test('createStudioSlideMutationRestoreStateCapturer marks object-form baseline failures', () => {
  const captureState = mutation.createStudioSlideMutationRestoreStateCapturer({
    saveHistoryState: () => ({ didCapture: false }),
    getActiveSlideId: () => 'slide-1',
    getCommittedSelectedElementIds: () => []
  });

  assert.deepEqual(captureState({}), {
    historyCaptureFailed: true,
    preservedActiveSlideId: 'slide-1',
    preservedSelectionIds: []
  });
});

test('createStudioSlideMutationRestoreStateCapturer marks thrown baseline failures', () => {
  const captureState = mutation.createStudioSlideMutationRestoreStateCapturer({
    saveHistoryState: () => {
      throw new Error('history unavailable');
    },
    getActiveSlideId: () => 'slide-1',
    getCommittedSelectedElementIds: () => []
  });

  assert.deepEqual(captureState({}), {
    historyCaptureFailed: true,
    preservedActiveSlideId: 'slide-1',
    preservedSelectionIds: []
  });
});

test('finalizeStudioLayerOrderMutation preserves layer UI ordering around shared persistence', () => {
  const calls = [];
  const transaction = { id: 'tx-layer-order' };
  const canonicalDeck = { kind: 'slidenext.deck', slides: [] };

  assert.equal(mutation.finalizeStudioLayerOrderMutation({
    versionLabel: 'Auto: Layer Order',
    transaction,
    canonicalDeck,
    finalizeMutation(label, options) {
      calls.push(['finalize', label, options]);
      return 'delegated';
    },
    updateLayerOrderActionState() {
      calls.push('layer-controls');
    }
  }), 'delegated');

  assert.deepEqual(calls, [
    ['finalize', 'Auto: Layer Order', {
      refreshThumbnails: false,
      refreshLayersList: true,
      transaction,
      canonicalDeck
    }],
    'layer-controls'
  ]);
});

test('finalizeStudioLayerOrderMutation preserves delegated results when layer controls refresh throws', () => {
  assert.equal(mutation.finalizeStudioLayerOrderMutation({
    versionLabel: 'Auto: Layer Order',
    finalizeMutation() {
      return 'delegated';
    },
    updateLayerOrderActionState() {
      throw new Error('layer controls unavailable');
    }
  }), 'delegated');
});

test('finalizeStudioLayerOrderMutation forwards canonical decks to fallback history persistence', () => {
  const calls = [];
  const canonicalDeck = { kind: 'slidenext.deck', slides: [] };

  mutation.finalizeStudioLayerOrderMutation({
    versionLabel: 'Auto: Layer Order',
    transaction: { id: 'tx-layer-order-fallback' },
    canonicalDeck,
    saveHistoryState(...args) {
      calls.push(args);
    }
  });

  assert.deepEqual(calls, [[false, { id: 'tx-layer-order-fallback' }, canonicalDeck]]);
});

test('finalizeStudioLayerOrderMutation falls back to layer persistence ordering', () => {
  const calls = [];
  const transaction = { id: 'tx-layer-order-fallback' };

  assert.equal(mutation.finalizeStudioLayerOrderMutation({
    versionLabel: 'Auto: Layer Order',
    transaction,
    saveHistoryState(...args) {
      calls.push(['history', ...args]);
    },
    triggerAutoSave() {
      calls.push('save');
    },
    updateLayersList() {
      calls.push('layers');
    },
    updateLayerOrderActionState() {
      calls.push('layer-controls');
    },
    triggerAutoVersion(label) {
      calls.push(['version', label]);
    }
  }), 'Auto: Layer Order');

  assert.deepEqual(calls, [
    ['history', false, transaction],
    'save',
    'layers',
    'layer-controls',
    ['version', 'Auto: Layer Order']
  ]);
});

test('finalizeStudioLayerOrderMutation converts thrown fallback autosave to rejection', () => {
  const calls = [];

  assert.equal(mutation.finalizeStudioLayerOrderMutation({
    versionLabel: 'Auto: Rejected Layer Order',
    saveHistoryState() {
      calls.push('history');
    },
    triggerAutoSave() {
      throw new Error('autosave unavailable');
    },
    updateLayersList() {
      throw new Error('layers should not refresh');
    },
    triggerAutoVersion() {
      throw new Error('versioning should not run');
    }
  }), false);

  assert.deepEqual(calls, ['history']);
});

test('finalizeStudioLayerOrderMutation propagates rejected fallback history', () => {
  assert.equal(mutation.finalizeStudioLayerOrderMutation({
    versionLabel: 'Auto: Rejected Layer Order',
    transaction: { id: 'tx' },
    saveHistoryState: () => {
      throw new Error('history unavailable');
    },
    triggerAutoSave: () => {
      throw new Error('autosave should not run');
    }
  }), false);
});

test('finalizeStudioLayerOrderMutation contains thrown persistence failures', () => {
  assert.equal(mutation.finalizeStudioLayerOrderMutation({
    versionLabel: 'Auto: Layer Order',
    finalizeMutation: () => {
      throw new Error('layer finalization failed');
    }
  }), false);
});

test('finalizeStudioWallpaperMutation delegates or preserves wallpaper persistence ordering', () => {
  const transaction = { id: 'tx-wallpaper' };
  const delegatedCalls = [];
  assert.equal(mutation.finalizeStudioWallpaperMutation({
    versionLabel: 'Auto: Background',
    transaction,
    finalizeMutation(label, options) {
      delegatedCalls.push([label, options]);
      return 'delegated';
    }
  }), 'delegated');
  assert.deepEqual(delegatedCalls, [['Auto: Background', { transaction }]]);

  const fallbackCalls = [];
  assert.equal(mutation.finalizeStudioWallpaperMutation({
    versionLabel: 'Auto: Background',
    transaction,
    generateThumbnails() {
      fallbackCalls.push('thumbnails');
    },
    saveHistoryState(...args) {
      fallbackCalls.push(['history', ...args]);
    },
    triggerAutoSave() {
      fallbackCalls.push('save');
    },
    triggerAutoVersion(label) {
      fallbackCalls.push(['version', label]);
    }
  }), 'Auto: Background');
  assert.deepEqual(fallbackCalls, [
    'thumbnails',
    ['history', false, transaction],
    'save',
    ['version', 'Auto: Background']
  ]);
});

test('finalizeStudioWallpaperMutation preserves fallback persistence when thumbnail refresh throws', () => {
  const calls = [];
  assert.equal(mutation.finalizeStudioWallpaperMutation({
    versionLabel: 'Auto: Background',
    generateThumbnails() {
      throw new Error('thumbnail refresh failed');
    },
    saveHistoryState() {
      calls.push('history');
    },
    triggerAutoSave() {
      calls.push('save');
    },
    triggerAutoVersion(label) {
      calls.push(['version', label]);
    }
  }), 'Auto: Background');
  assert.deepEqual(calls, ['history', 'save', ['version', 'Auto: Background']]);
});

test('finalizeStudioWallpaperMutation forwards an optional canonical deck sidecar', () => {
  const canonicalDeck = { kind: 'slidenext.deck', slides: [] };
  let delegatedOptions = null;

  assert.equal(mutation.finalizeStudioWallpaperMutation({
    versionLabel: 'Auto: Background',
    transaction: { id: 'tx-wallpaper-canonical' },
    canonicalDeck,
    finalizeMutation(label, options) {
      delegatedOptions = { label, options };
      return 'delegated';
    }
  }), 'delegated');

  assert.deepEqual(delegatedOptions, {
    label: 'Auto: Background',
    options: {
      transaction: { id: 'tx-wallpaper-canonical' },
      canonicalDeck
    }
  });
});

test('finalizeStudioWallpaperMutation propagates rejected fallback history', () => {
  assert.equal(mutation.finalizeStudioWallpaperMutation({
    versionLabel: 'Auto: Rejected Background',
    transaction: { id: 'tx' },
    canonicalDeck: { kind: 'slidenext.deck', slides: [] },
    saveHistoryState: () => {
      throw new Error('history unavailable');
    },
    generateThumbnails() {},
    triggerAutoSave: () => {
      throw new Error('autosave should not run');
    }
  }), false);
});

test('finalizeStudioWallpaperMutation contains thrown persistence failures', () => {
  assert.equal(mutation.finalizeStudioWallpaperMutation({
    versionLabel: 'Auto: Background',
    finalizeMutation: () => {
      throw new Error('wallpaper finalization failed');
    }
  }), false);
});

test('finalizeStudioWallpaperMutation preserves a canonical sidecar in the fallback path', () => {
  const canonicalDeck = { kind: 'slidenext.deck', slides: [] };
  let historyArgs = null;

  mutation.finalizeStudioWallpaperMutation({
    transaction: { id: 'tx-wallpaper-fallback-canonical' },
    canonicalDeck,
    saveHistoryState(...args) {
      historyArgs = args;
    }
  });

  assert.deepEqual(historyArgs, [
    false,
    { id: 'tx-wallpaper-fallback-canonical' },
    canonicalDeck
  ]);
});
