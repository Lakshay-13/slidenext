const test = require('node:test');
const assert = require('node:assert/strict');

const actions = require('../shared/studio-editor-notes-actions.js');

test('applyStudioSpeakerNotesEdit coordinates readiness, mutation, persistence, and refresh', () => {
  const frame = { id: 'live-frame' };
  const slide = { id: 'slide-1' };
  const transaction = { kind: 'slidenext.editor.transaction' };
  const calls = [];
  const notesApi = {
    applyStudioSpeakerNotes(nextSlide, value, options) {
      calls.push(['apply', nextSlide, value, options]);
      return { didApply: true, transaction };
    }
  };

  const result = actions.applyStudioSpeakerNotesEdit('Cue', {
    resolveReadyState() {
      calls.push(['ready']);
      return { canUseDeckActions: true };
    },
    getDocument() {
      calls.push(['document']);
      return frame;
    },
    getActiveSlide(nextFrame) {
      calls.push(['active-slide', nextFrame]);
      return slide;
    },
    notesApi,
    transactionApi: { id: 'transaction-api' },
    getElementId: () => 'slide:slide-1',
    finalizeMutation(label, options) {
      calls.push(['finalize', label, options]);
    },
    syncChrome(nextFrame) {
      calls.push(['sync', nextFrame]);
    }
  });

  assert.equal(result, true);
  assert.deepEqual(calls.map(([name]) => name), [
    'ready',
    'document',
    'active-slide',
    'apply',
    'finalize',
    'sync'
  ]);
  assert.equal(calls[3][3].transactionApi.id, 'transaction-api');
  assert.equal(calls[3][3].getElementId(slide), 'slide:slide-1');
  assert.deepEqual(calls[4], [
    'finalize',
    'Auto: Updated Speaker Notes',
    { refreshThumbnails: false, transaction }
  ]);
  assert.deepEqual(calls[5], ['sync', frame]);
});

test('applyStudioSpeakerNotesEdit does not mutate when the deck is unavailable', () => {
  let mutationCalls = 0;
  const result = actions.applyStudioSpeakerNotesEdit('Ignored', {
    resolveReadyState: () => ({ canUseDeckActions: false }),
    notesApi: {
      applyStudioSpeakerNotes() {
        mutationCalls += 1;
        return { didApply: true };
      }
    },
    finalizeMutation() {
      throw new Error('should not finalize');
    }
  });

  assert.equal(result, false);
  assert.equal(mutationCalls, 0);
});

test('applyStudioSpeakerNotesEdit rolls back metadata when persistence rejects', () => {
  const calls = [];
  const transaction = { kind: 'notes' };
  const result = actions.applyStudioSpeakerNotesEdit('Cue', {
    resolveReadyState: () => ({ canUseDeckActions: true }),
    getDocument: () => ({ id: 'frame' }),
    getActiveSlide: () => ({ id: 'slide-1' }),
    notesApi: {
      applyStudioSpeakerNotes() {
        return { didApply: true, transaction };
      }
    },
    finalizeMutation: () => false,
    rollbackMutation: (nextTransaction, doc) => {
      assert.equal(nextTransaction, transaction);
      assert.equal(doc.id, 'frame');
      calls.push('rollback');
    },
    syncChrome: () => calls.push('sync')
  });

  assert.equal(result, false);
  assert.deepEqual(calls, ['rollback', 'sync']);
});

test('applyStudioSpeakerNotesEdit rolls back metadata when finalization throws', () => {
  const calls = [];
  const transaction = { kind: 'notes' };
  const result = actions.applyStudioSpeakerNotesEdit('Cue', {
    resolveReadyState: () => ({ canUseDeckActions: true }),
    getDocument: () => ({ id: 'frame' }),
    getActiveSlide: () => ({ id: 'slide-1' }),
    notesApi: {
      applyStudioSpeakerNotes() {
        return { didApply: true, transaction };
      }
    },
    finalizeMutation: () => {
      throw new Error('history finalization failed');
    },
    rollbackMutation: (nextTransaction, doc) => {
      assert.equal(nextTransaction, transaction);
      assert.equal(doc.id, 'frame');
      calls.push('rollback');
    },
    syncChrome: () => calls.push('sync')
  });

  assert.equal(result, false);
  assert.deepEqual(calls, ['rollback', 'sync']);
});

test('applyStudioSpeakerNotesEdit forwards an explicit canonical metadata sidecar', () => {
  const calls = [];
  const canonicalDeckBeforeMutation = { id: 'before' };
  const canonicalDeck = { id: 'after' };
  const getSlideId = (slide) => slide.id;
  const result = actions.applyStudioSpeakerNotesEdit('Cue', {
    resolveReadyState: () => ({ canUseDeckActions: true }),
    getDocument: () => ({ id: 'frame' }),
    getActiveSlide: () => ({ id: 'slide-1' }),
    notesApi: {
      applyStudioSpeakerNotes() {
        return { didApply: true, transaction: { kind: 'notes' } };
      }
    },
    canonicalMetadataKey: 'notes',
    buildCanonicalMetadataBaseline(options) {
      calls.push(['baseline', options]);
      return canonicalDeckBeforeMutation;
    },
    buildCanonicalMetadataDeck(slide, patch, options) {
      calls.push(['deck', slide, patch, options]);
      return canonicalDeck;
    },
    getSlideId,
    finalizeMutation(label, options) {
      calls.push(['finalize', label, options]);
    }
  });

  assert.equal(result, true);
  assert.deepEqual(calls, [
    ['baseline', { sourceDocument: { id: 'frame' } }],
    ['deck', { id: 'slide-1' }, { notes: 'Cue' }, {
      sourceDocument: { id: 'frame' },
      canonicalDeckBeforeMutation,
      getSlideId
    }],
    ['finalize', 'Auto: Updated Speaker Notes', {
      refreshThumbnails: false,
      transaction: { kind: 'notes' },
      canonicalDeck
    }]
  ]);
});

test('applyStudioSpeakerNotesEdit fails closed before metadata mutation when the canonical sidecar is unavailable', () => {
  let mutationCalls = 0;
  const result = actions.applyStudioSlideMetadataEdit('Cue', {
    resolveReadyState: () => ({ canUseDeckActions: true }),
    getDocument: () => ({ id: 'frame' }),
    getActiveSlide: () => ({ id: 'slide-1' }),
    metadataApi: {
      applyStudioSpeakerNotes() {
        mutationCalls += 1;
        return { didApply: true, transaction: null };
      }
    },
    metadataMethod: 'applyStudioSpeakerNotes',
    canonicalMetadataKey: 'notes',
    buildCanonicalMetadataBaseline: () => ({ id: 'before' }),
    buildCanonicalMetadataDeck: () => null,
    finalizeMutation: () => {
      throw new Error('should not finalize');
    }
  });

  assert.equal(result, false);
  assert.equal(mutationCalls, 0);
});

test('applyStudioSpeakerNotesEdit refuses to mutate without a persistence finalizer', () => {
  let mutationCalls = 0;
  const result = actions.applyStudioSpeakerNotesEdit('Ignored', {
    resolveReadyState: () => ({ canUseDeckActions: true }),
    getDocument: () => ({}),
    getActiveSlide: () => ({}),
    notesApi: {
      applyStudioSpeakerNotes() {
        mutationCalls += 1;
        return { didApply: true };
      }
    }
  });

  assert.equal(result, false);
  assert.equal(mutationCalls, 0);
});

test('applyStudioSlideSectionEdit uses the section metadata mutation and label', () => {
  const calls = [];
  const result = actions.applyStudioSlideSectionEdit('Research', {
    resolveReadyState: () => ({ canUseDeckActions: true }),
    getDocument: () => ({ id: 'frame' }),
    getActiveSlide: () => ({ id: 'slide-1' }),
    sectionApi: {
      applyStudioSlideSection(slide, value, options) {
        calls.push(['apply', slide, value, options]);
        return { didApply: true, transaction: { kind: 'section' } };
      }
    },
    finalizeMutation(label, options) {
      calls.push(['finalize', label, options]);
    }
  });

  assert.equal(result, true);
  assert.equal(calls[0][0], 'apply');
  assert.equal(calls[0][2], 'Research');
  assert.deepEqual(calls[1], [
    'finalize',
    'Auto: Updated Slide Section',
    { refreshThumbnails: false, transaction: { kind: 'section' } }
  ]);
});
