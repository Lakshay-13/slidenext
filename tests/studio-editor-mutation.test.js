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
