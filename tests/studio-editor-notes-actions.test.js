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
