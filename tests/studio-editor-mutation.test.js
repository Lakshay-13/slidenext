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
