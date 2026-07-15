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
  assert.equal(mutation.finalizeStudioSelectionToggleMutation({
    versionLabel: 'Auto: Locked Element',
    mutationOptions: {
      transaction: { id: 'tx-2' }
    },
    syncSelectionUi() {
      calls.push(['selection']);
    },
    finalizeMutation(label, options) {
      calls.push(['finalize', label, options]);
    }
  }), true);

  assert.deepEqual(calls, [
    ['selection'],
    ['finalize', 'Auto: Locked Element', {
      refreshThumbnails: false,
      transaction: { id: 'tx-2' }
    }]
  ]);
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

test('finalizeStudioLayerOrderMutation preserves layer UI ordering around shared persistence', () => {
  const calls = [];
  const transaction = { id: 'tx-layer-order' };

  assert.equal(mutation.finalizeStudioLayerOrderMutation({
    versionLabel: 'Auto: Layer Order',
    transaction,
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
      transaction
    }],
    'layer-controls'
  ]);
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
