const test = require('node:test');
const assert = require('node:assert/strict');

const notes = require('../shared/studio-editor-notes.js');
const transaction = require('../shared/studio-editor-transaction.js');

function createSlide(attributes = {}) {
  const state = { ...attributes };
  return {
    dataset: { editorId: 'slide-1' },
    getAttribute(name) {
      return Object.prototype.hasOwnProperty.call(state, name) ? state[name] : null;
    },
    setAttribute(name, value) {
      state[name] = `${value}`;
    },
    removeAttribute(name) {
      delete state[name];
    },
    get state() {
      return { ...state };
    }
  };
}

test('applyStudioSpeakerNotes replaces legacy notes and creates a reversible dataset transaction', () => {
  const slide = createSlide({ 'data-notes': 'Old cue' });
  const mutation = notes.applyStudioSpeakerNotes(slide, 'New cue', {
    transactionApi: transaction,
    getElementId: (element) => element.dataset.editorId
  });

  assert.equal(mutation.didApply, true);
  assert.equal(notes.getStudioSpeakerNotes(slide), 'New cue');
  assert.deepEqual(slide.state, { 'data-speaker-notes': 'New cue' });
  assert.deepEqual(mutation.transaction.operations, [
    {
      type: 'dataset',
      elementId: 'slide-1',
      property: 'speakerNotes',
      before: '',
      after: 'New cue'
    },
    {
      type: 'dataset',
      elementId: 'slide-1',
      property: 'notes',
      before: 'Old cue',
      after: ''
    }
  ]);
});

test('applyStudioSpeakerNotes removes both note attributes when cleared', () => {
  const slide = createSlide({
    'data-speaker-notes': 'Existing cue',
    'data-notes': 'Legacy cue'
  });

  const mutation = notes.applyStudioSpeakerNotes(slide, '');

  assert.equal(mutation.didApply, true);
  assert.equal(notes.getStudioSpeakerNotes(slide), '');
  assert.deepEqual(slide.state, {});
  assert.equal(mutation.transaction, null);
});

test('syncStudioSpeakerNotesControl handles canonical fallback slides and empty editor state', () => {
  const control = { value: '', disabled: false };
  const documentRef = {
    getElementById(id) {
      return id === 'speakerNotesInput' ? control : null;
    }
  };

  assert.equal(notes.syncStudioSpeakerNotesControl({
    documentRef,
    activeSlide: { notes: 'Canonical cue' },
    canEdit: true
  }), true);
  assert.equal(control.value, 'Canonical cue');
  assert.equal(control.disabled, false);

  notes.syncStudioSpeakerNotesControl({ documentRef, activeSlide: null, canEdit: false });
  assert.equal(control.value, '');
  assert.equal(control.disabled, true);
});

test('applyStudioSlideSection stores section metadata in a reversible dataset transaction', () => {
  const slide = createSlide();
  const mutation = notes.applyStudioSlideSection(slide, 'Research', {
    transactionApi: transaction,
    getElementId: (element) => `slide:${element.dataset.editorId}`
  });

  assert.equal(mutation.didApply, true);
  assert.equal(notes.getStudioSlideSection(slide), 'Research');
  assert.deepEqual(slide.state, { 'data-slide-section': 'Research' });
  assert.deepEqual(mutation.transaction.operations, [{
    type: 'dataset',
    elementId: 'slide:slide-1',
    property: 'slideSection',
    before: '',
    after: 'Research'
  }]);
});

test('syncStudioSlideSectionControl reads canonical section fallback and disables without an active slide', () => {
  const control = { value: '', disabled: false };
  const documentRef = {
    getElementById(id) {
      return id === 'slideSectionInput' ? control : null;
    }
  };

  assert.equal(notes.syncStudioSlideSectionControl({
    documentRef,
    activeSlide: { section: 'Closing' },
    canEdit: true
  }), true);
  assert.equal(control.value, 'Closing');
  assert.equal(control.disabled, false);

  notes.syncStudioSlideSectionControl({ documentRef, activeSlide: null, canEdit: false });
  assert.equal(control.value, '');
  assert.equal(control.disabled, true);
});
