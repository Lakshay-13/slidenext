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
  const canonicalDeck = { kind: 'deck', slides: [] };

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

  const canonicalDeck = { kind: 'deck', slides: [] };
  assert.equal(finalize('Auto: Slide', { kind: 'transaction' }, canonicalDeck), 'Auto: Slide');
  assert.deepEqual(calls, [
    ['history', false, { kind: 'transaction' }, canonicalDeck],
    ['save'],
    ['version', 'Auto: Slide']
  ]);
});

test('createStudioEditorSlideMutationPersistenceFinalizer propagates rejected fallback history', () => {
  const finalize = slideMutation.createStudioEditorSlideMutationPersistenceFinalizer({
    saveHistoryState: () => ({ didCapture: false }),
    triggerAutoSave: () => {
      throw new Error('autosave should not run');
    }
  });

  assert.equal(finalize('Auto: Rejected', { kind: 'transaction' }), false);
});

test('createStudioEditorSlideMutationPersistenceFinalizer converts thrown fallback history to rejection', () => {
  const finalize = slideMutation.createStudioEditorSlideMutationPersistenceFinalizer({
    saveHistoryState: () => {
      throw new Error('history unavailable');
    },
    triggerAutoSave: () => {
      throw new Error('autosave should not run');
    }
  });

  assert.equal(finalize('Auto: Rejected', { kind: 'transaction' }), false);
});

test('createStudioEditorSlideMutationPersistenceFinalizer drops invalid fallback sidecars', () => {
  const calls = [];
  const finalize = slideMutation.createStudioEditorSlideMutationPersistenceFinalizer({
    isCanonicalDeck: () => false,
    saveHistoryState(...args) {
      calls.push(args);
    }
  });

  assert.equal(
    finalize('Auto: Slide', { kind: 'transaction' }, { kind: 'deck', slides: [] }),
    'Auto: Slide'
  );
  assert.deepEqual(calls, [[false, { kind: 'transaction' }]]);
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

test('createStudioEditorSlideMutationRestoreStateCapturer reports rejected fallback history', () => {
  const capture = slideMutation.createStudioEditorSlideMutationRestoreStateCapturer({
    saveHistoryState: () => ({ didCapture: false }),
    getActiveSlideId() {
      throw new Error('active slide state should not be read');
    },
    getSelectedElementIds() {
      throw new Error('selection state should not be read');
    }
  });

  assert.deepEqual(capture({ id: 'doc' }), {
    historyCaptureFailed: true,
    preservedActiveSlideId: '',
    preservedSelectionIds: []
  });
});

test('createStudioEditorSlideMutationRestoreStateCapturer reports thrown fallback history', () => {
  const capture = slideMutation.createStudioEditorSlideMutationRestoreStateCapturer({
    saveHistoryState: () => {
      throw new Error('history unavailable');
    },
    getActiveSlideId() {
      throw new Error('active slide state should not be read');
    },
    getSelectedElementIds() {
      throw new Error('selection state should not be read');
    }
  });

  assert.deepEqual(capture({ id: 'doc' }), {
    historyCaptureFailed: true,
    preservedActiveSlideId: '',
    preservedSelectionIds: []
  });
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
