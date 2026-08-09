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

test('createStudioEditorSlideMutationRestoreStateCapturer uses a canonical baseline without shared adapters', () => {
  const doc = { id: 'doc' };
  const canonicalDeck = { kind: 'slidenext.deck', slides: [] };
  const calls = [];
  const capture = slideMutation.createStudioEditorSlideMutationRestoreStateCapturer({
    buildCanonicalDeck(nextDoc) {
      calls.push(['build', nextDoc]);
      return canonicalDeck;
    },
    saveHistoryState(...args) {
      calls.push(['history', ...args]);
    },
    getActiveSlideId() {
      return 'slide-2';
    },
    getSelectedElementIds() {
      return ['node-1'];
    }
  });

  assert.deepEqual(capture(doc), {
    preservedActiveSlideId: 'slide-2',
    preservedSelectionIds: ['node-1']
  });
  assert.deepEqual(calls, [
    ['build', doc],
    ['history', false, null, canonicalDeck]
  ]);
});

test('createStudioEditorSlideMutationRestoreStateCapturer passes canonical capture options to deck view fallback', () => {
  const canonicalDeck = { kind: 'slidenext.deck', slides: [] };
  let delegatedOptions = null;
  const capture = slideMutation.createStudioEditorSlideMutationRestoreStateCapturer({
    deckViewApi: {
      captureStudioDeckViewBeforeSlideMutation(options) {
        delegatedOptions = options;
        return { preservedActiveSlideId: 'slide-1', preservedSelectionIds: [] };
      }
    },
    buildCanonicalDeck() {
      return canonicalDeck;
    },
    saveHistoryState() {},
    getActiveSlideId() {},
    getSelectedElementIds() {}
  });

  assert.deepEqual(capture({ id: 'doc' }), {
    preservedActiveSlideId: 'slide-1',
    preservedSelectionIds: []
  });
  assert.equal(delegatedOptions.buildCanonicalDeck(), canonicalDeck);
});

test('restoreStudioEditorDeckViewAfterSlideMutation forwards slide restore options', () => {
  const calls = [];
  const doc = { id: 'doc' };
  const selectionIds = ['node-1'];
  const result = slideMutation.restoreStudioEditorDeckViewAfterSlideMutation(doc, selectionIds, {
    deckViewApi: {
      restoreStudioDeckViewAfterSlideMutation(options) {
        calls.push(options);
        options.restoreActiveSlideById('slide-2');
        options.restoreSelectionState();
        options.setActiveSlideByIndex(1);
        return true;
      }
    },
    preservedActiveSlideId: 'slide-2',
    removedSlideId: 'slide-1',
    fallbackIndex: 1,
    restoreActiveSlideById(slideId, nextDoc) {
      assert.equal(slideId, 'slide-2');
      assert.equal(nextDoc, doc);
    },
    restoreSelectionState(nextSelectionIds, nextDoc) {
      assert.deepEqual(nextSelectionIds, selectionIds);
      assert.equal(nextDoc, doc);
    },
    setActiveSlideByIndex(index) {
      assert.equal(index, 1);
    }
  });

  assert.equal(result, true);
  assert.equal(calls[0].fallbackIndex, 1);
  assert.equal(calls[0].preservedActiveSlideId, 'slide-2');
  assert.equal(calls[0].removedSlideId, 'slide-1');
});
