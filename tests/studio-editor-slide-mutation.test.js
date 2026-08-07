const test = require('node:test');
const assert = require('node:assert/strict');

const slideMutation = require('../shared/studio-editor-slide-mutation.js');

test('createStudioEditorSlideMutationPersistenceFinalizer delegates shared mutation lifecycle', () => {
  const calls = [];
  const mutationApi = {
    finalizeStudioSlideMutation(options) {
      calls.push(options);
      return 'delegated';
    }
  };
  const saveHistoryState = () => {};
  const triggerAutoSave = () => {};
  const triggerAutoVersion = () => {};
  const finalize = slideMutation.createStudioEditorSlideMutationPersistenceFinalizer({
    mutationApi,
    saveHistoryState,
    triggerAutoSave,
    triggerAutoVersion
  });
  const transaction = { kind: 'transaction' };
  const canonicalDeck = { kind: 'deck' };

  assert.equal(finalize('Auto: Slide', transaction, canonicalDeck), 'delegated');
  assert.deepEqual(calls, [{
    versionLabel: 'Auto: Slide',
    transaction,
    canonicalDeck,
    saveHistoryState,
    triggerAutoSave,
    triggerAutoVersion
  }]);
});

test('createStudioEditorSlideMutationPersistenceFinalizer preserves the local fallback lifecycle', () => {
  const calls = [];
  const finalize = slideMutation.createStudioEditorSlideMutationPersistenceFinalizer({
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

  assert.equal(finalize('Auto: Slide', { kind: 'transaction' }, { kind: 'deck' }), 'Auto: Slide');
  assert.deepEqual(calls, [
    ['history', false, { kind: 'transaction' }, { kind: 'deck' }],
    ['save'],
    ['version', 'Auto: Slide']
  ]);
});

test('createStudioEditorSlideMutationRestoreStateCapturer preserves active slide and selection fallback', () => {
  const calls = [];
  const capture = slideMutation.createStudioEditorSlideMutationRestoreStateCapturer({
    saveHistoryState() {
      calls.push('history');
    },
    getActiveSlideId(doc) {
      calls.push(['active', doc]);
      return 'slide-2';
    },
    getSelectedElementIds(doc) {
      calls.push(['selection', doc]);
      return ['node-1'];
    }
  });
  const doc = { id: 'doc' };

  assert.deepEqual(capture(doc), {
    preservedActiveSlideId: 'slide-2',
    preservedSelectionIds: ['node-1']
  });
  assert.deepEqual(calls, ['history', ['active', doc], ['selection', doc]]);
});
