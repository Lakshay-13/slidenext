const test = require('node:test');
const assert = require('node:assert/strict');

const activeSlideView = require('../shared/studio-editor-active-slide-view.js');

test('syncStudioActiveSlideChrome coordinates live slide chrome and history', () => {
  let currentSlideIndex = 0;
  let preserveSelectionRequest = true;
  let currentSlideId = '';
  const calls = [];
  const canonicalDeck = {
    kind: 'slidenext.deck',
    slides: [{ id: 'slide-3', nodes: [] }]
  };

  const didSync = activeSlideView.syncStudioActiveSlideChrome({ label: 'iframe-doc' }, {
    captureHistory: true,
    getCurrentSlideIndex: () => currentSlideIndex,
    getPreserveSelectionOnNextActiveSlideSync: () => preserveSelectionRequest,
    setPreserveSelectionOnNextActiveSlideSync(value) {
      preserveSelectionRequest = value;
      calls.push(['clear-preserve', value]);
    },
    syncStudioActiveSlideView(doc, options) {
      calls.push(['sync-live', doc, options.preserveSelection]);
      options.setCurrentSlideIndex(2);
      return { didSync: true };
    },
    getActiveSlide() {
      return { id: 'slide-3' };
    },
    buildEditorCanonicalDeck(doc) {
      calls.push(['canonical', doc]);
      return canonicalDeck;
    },
    syncCustomGradientControls() {
      calls.push(['gradient']);
      return true;
    },
    syncWallpaperTabChrome(doc, options) {
      calls.push(['tabs', doc.id, options.didSyncCustomGradientControls]);
    },
    syncSolidWallpaperControl() {
      calls.push(['solid']);
    },
    refreshActionStateChrome(doc) {
      calls.push(['actions', doc.label]);
    },
    syncSelectionChrome(preserveSelection) {
      calls.push(['selection', preserveSelection]);
    },
    updateCurrentPresentationSessionState(nextState) {
      currentSlideIndex = nextState.slideIndex;
      calls.push(['session', currentSlideIndex]);
    },
    setCurrentSlideId(nextValue) {
      currentSlideId = nextValue;
      calls.push(['slide-id', nextValue]);
    },
    saveHistoryState(...args) {
      calls.push(['history', ...args]);
    }
  });

  assert.equal(didSync, true);
  assert.equal(currentSlideIndex, 2);
  assert.equal(currentSlideId, 'slide-3');
  assert.equal(preserveSelectionRequest, false);
  assert.deepEqual(calls.map(call => call[0]), [
    'sync-live',
    'session',
    'slide-id',
    'gradient',
    'tabs',
    'solid',
    'actions',
    'selection',
    'clear-preserve',
    'canonical',
    'history'
  ]);
  assert.deepEqual(calls.at(-2), ['canonical', { label: 'iframe-doc' }]);
  assert.deepEqual(calls.at(-1), ['history', false, null, canonicalDeck]);
});

test('syncStudioActiveSlideChrome uses the canonical fallback when no iframe exists', () => {
  let currentSlideIndex = 0;
  const calls = [];
  const didSync = activeSlideView.syncStudioActiveSlideChrome(null, {
    captureHistory: true,
    getCurrentSlideIndex: () => currentSlideIndex,
    buildEditorDeckSnapshot() {
      return {
        activeSlideIndex: 1,
        slides: [{ id: 'slide-1' }, { id: 'slide-2' }]
      };
    },
    resolveStudioActiveSlideIndex(snapshot, fallbackIndex) {
      calls.push(['resolve', snapshot, fallbackIndex]);
      return snapshot.activeSlideIndex;
    },
    updateCurrentPresentationSessionState(nextState) {
      currentSlideIndex = nextState.slideIndex;
      calls.push(['session', currentSlideIndex]);
    },
    setCurrentSlideId(nextValue) {
      calls.push(['slide-id', nextValue]);
    },
    updateActiveThumbnailCardState(slideId) {
      calls.push(['thumbnail', slideId]);
    },
    setSlideCountLabel(label) {
      calls.push(['count', label]);
    },
    refreshActionStateChrome(doc) {
      calls.push(['actions', doc]);
    },
    syncSelectionChrome(preserveSelection) {
      calls.push(['selection', preserveSelection]);
    },
    setPreserveSelectionOnNextActiveSlideSync(value) {
      calls.push(['clear-preserve', value]);
    },
    saveHistoryState(debounce) {
      calls.push(['history', debounce]);
    }
  });

  assert.equal(didSync, true);
  assert.equal(currentSlideIndex, 1);
  assert.equal(calls[0][0], 'resolve');
  assert.deepEqual(calls.slice(1).map(call => call[0]), [
    'session',
    'slide-id',
    'thumbnail',
    'count',
    'actions',
    'selection',
    'clear-preserve',
    'history'
  ]);
});

test('syncStudioActiveSlideChrome refreshes speaker notes for the active slide', () => {
  const calls = [];

  const didSync = activeSlideView.syncStudioActiveSlideChrome({ label: 'iframe-doc' }, {
    getCurrentSlideIndex: () => 0,
    syncStudioActiveSlideView() {
      return { didSync: true };
    },
    getActiveSlide() {
      return { id: 'slide-1' };
    },
    syncSpeakerNotesControl(activeSlide) {
      calls.push(activeSlide);
    }
  });

  assert.equal(didSync, true);
  assert.deepEqual(calls, [{ id: 'slide-1' }]);
});

test('syncStudioActiveSlideChrome publishes the resolved DOM slide ID', () => {
  let slideId = '';

  const didSync = activeSlideView.syncStudioActiveSlideChrome({ label: 'iframe-doc' }, {
    getCurrentSlideIndex: () => 0,
    syncStudioActiveSlideView() {
      return { didSync: true };
    },
    getActiveSlide() {
      return { id: 'dom-id' };
    },
    getSlideId(slide) {
      return slide.id;
    },
    setCurrentSlideId(nextValue) {
      slideId = nextValue;
    }
  });

  assert.equal(didSync, true);
  assert.equal(slideId, 'dom-id');
});

test('syncStudioActiveSlideChrome refreshes slide section for the active slide', () => {
  const calls = [];

  activeSlideView.syncStudioActiveSlideChrome({ label: 'iframe-doc' }, {
    getCurrentSlideIndex: () => 0,
    syncStudioActiveSlideView() {
      return { didSync: true };
    },
    getActiveSlide() {
      return { id: 'slide-1' };
    },
    syncSlideSectionControl(activeSlide) {
      calls.push(activeSlide);
    }
  });

  assert.deepEqual(calls, [{ id: 'slide-1' }]);
});

test('syncStudioActiveSlideChrome prefers canonical metadata for active-slide controls', () => {
  const calls = [];
  const domSlide = { id: 'dom-slide' };
  const canonicalSlide = { id: 'canonical-slide', notes: 'Cue', section: 'Research' };

  const didSync = activeSlideView.syncStudioActiveSlideChrome({ label: 'iframe-doc' }, {
    getCurrentSlideIndex: () => 0,
    syncStudioActiveSlideView() {
      return { didSync: true };
    },
    getActiveSlide() {
      return domSlide;
    },
    buildEditorDeckSnapshot() {
      return {
        activeSlideIndex: 0,
        slides: [canonicalSlide]
      };
    },
    resolveStudioActiveSlideIndex(snapshot, fallbackIndex) {
      return Number.isInteger(snapshot.activeSlideIndex) ? snapshot.activeSlideIndex : fallbackIndex;
    },
    syncSpeakerNotesControl(activeSlide) {
      calls.push(['notes', activeSlide]);
    },
    syncSlideSectionControl(activeSlide) {
      calls.push(['section', activeSlide]);
    }
  });

  assert.equal(didSync, true);
  assert.deepEqual(calls, [
    ['notes', canonicalSlide],
    ['section', canonicalSlide]
  ]);
});
