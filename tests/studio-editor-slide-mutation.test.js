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
