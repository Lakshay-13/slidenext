const test = require('node:test');
const assert = require('node:assert/strict');

const slideCommands = require('../shared/studio-editor-slide-commands.js');

test('prepareStudioSlideDuplication sanitizes, re-identifies, and decorates a cloned slide', () => {
  const duplicateSlide = {
    classList: {
      remove(className) {
        assert.equal(className, 'slide-active');
      }
    }
  };
  const sourceSlide = {
    cloneNode(deep) {
      assert.equal(deep, true);
      return duplicateSlide;
    }
  };
  const calls = [];

  const result = slideCommands.prepareStudioSlideDuplication(sourceSlide, {
    sanitizeDuplicatedSubtree(slide) {
      assert.equal(slide, duplicateSlide);
      calls.push('sanitize');
    },
    assignSlideId(slide, options) {
      assert.equal(slide, duplicateSlide);
      assert.deepEqual(options, { forceNew: true });
      calls.push('assign');
      return 'slide-2';
    },
    makeElementsHoverable(slide) {
      assert.equal(slide, duplicateSlide);
      calls.push('hoverable');
    }
  });

  assert.deepEqual(result, { slide: duplicateSlide, slideId: 'slide-2' });
  assert.deepEqual(calls, ['sanitize', 'assign', 'hoverable']);
});

test('prepareStudioSlideDuplication rejects missing clone or slide-id capabilities', () => {
  assert.equal(slideCommands.prepareStudioSlideDuplication(null), null);
  assert.equal(slideCommands.prepareStudioSlideDuplication({ cloneNode() {} }), null);
  assert.equal(slideCommands.prepareStudioSlideDuplication({ cloneNode: () => ({}) }, {
    assignSlideId() {
      return '';
    }
  }), null);
});

test('addStudioSlideNode preserves canonical insertion and mutation lifecycle ordering', () => {
  const doc = { id: 'editor-doc' };
  const container = { id: 'slides-container' };
  const newSlide = { id: 'slide-2' };
  const calls = [];

  const result = slideCommands.addStudioSlideNode({
    getIframeDoc() {
      calls.push('getIframeDoc');
      return doc;
    },
    resolveInsertionActionState(sourceDoc) {
      assert.equal(sourceDoc, doc);
      calls.push('resolveInsertionActionState');
      return { canAddSlide: true };
    },
    getSlideContainer(sourceDoc) {
      assert.equal(sourceDoc, doc);
      calls.push('getSlideContainer');
      return container;
    },
    getSlides(sourceDoc) {
      assert.equal(sourceDoc, doc);
      calls.push('getSlides');
      return [{ id: 'slide-1' }];
    },
    createBlankSlide(sourceDoc, index) {
      assert.equal(sourceDoc, doc);
      assert.equal(index, 1);
      calls.push('createBlankSlide');
      return newSlide;
    },
    getSlideId(slide) {
      assert.equal(slide, newSlide);
      calls.push('getSlideId');
      return 'slide-2';
    },
    buildCanonicalDeck(sourceDoc) {
      assert.equal(sourceDoc, doc);
      calls.push('buildCanonicalDeck');
      return { slides: [{ id: 'slide-1' }] };
    },
    importSlideToCanonicalSlide(slide, index, options) {
      assert.equal(slide, newSlide);
      assert.equal(index, 1);
      calls.push('importSlideToCanonicalSlide');
      return { id: options.getSlideId(), title: 'New' };
    },
    appendCanonicalSlide(deck, slide) {
      assert.deepEqual(deck.slides.map((item) => item.id), ['slide-1']);
      assert.equal(slide.id, 'slide-2');
      calls.push('appendCanonicalSlide');
      return { slides: [...deck.slides, slide] };
    },
    saveHistoryState() {
      calls.push('saveHistoryState');
    },
    applyInsertion(sourceContainer, slide) {
      assert.equal(sourceContainer, container);
      assert.equal(slide, newSlide);
      calls.push('applyInsertion');
      return { didApply: true, transaction: { type: 'markup' } };
    },
    generateThumbnails() {
      calls.push('generateThumbnails');
    },
    setActiveSlide(index) {
      assert.equal(index, 1);
      calls.push('setActiveSlide');
    },
    finalizeMutation(label, transaction, canonicalDeck) {
      assert.equal(label, 'Auto: Added Slide');
      assert.deepEqual(transaction, { type: 'markup' });
      assert.deepEqual(canonicalDeck.slides.map((slide) => slide.id), ['slide-1', 'slide-2']);
      calls.push('finalizeMutation');
    }
  });

  assert.equal(result, true);
  assert.deepEqual(calls, [
    'getIframeDoc',
    'resolveInsertionActionState',
    'getSlideContainer',
    'getSlides',
    'createBlankSlide',
    'getSlideId',
    'buildCanonicalDeck',
    'importSlideToCanonicalSlide',
    'appendCanonicalSlide',
    'saveHistoryState',
    'applyInsertion',
    'generateThumbnails',
    'setActiveSlide',
    'finalizeMutation'
  ]);
});

test('addStudioSlideNode stops before history when slide creation is unavailable', () => {
  const calls = [];

  assert.equal(slideCommands.addStudioSlideNode({
    getIframeDoc() {
      return {};
    },
    resolveInsertionActionState() {
      return { canAddSlide: true };
    },
    getSlideContainer() {
      return {};
    },
    getSlides() {
      return [];
    },
    createBlankSlide() {
      calls.push('createBlankSlide');
      return null;
    },
    saveHistoryState() {
      calls.push('saveHistoryState');
    }
  }), false);
  assert.deepEqual(calls, ['createBlankSlide']);
});

test('deleteStudioSlideNode preserves view state, canonical removal, and mutation lifecycle ordering', () => {
  const doc = { id: 'editor-doc' };
  const container = { id: 'slides-container' };
  const firstSlide = { id: 'slide-1' };
  const deletedSlide = { id: 'slide-2' };
  let slides = [firstSlide, deletedSlide];
  const calls = [];

  const result = slideCommands.deleteStudioSlideNode(1, {
    getIframeDoc() {
      calls.push('getIframeDoc');
      return doc;
    },
    getSlideContainer(sourceDoc) {
      assert.equal(sourceDoc, doc);
      calls.push('getSlideContainer');
      return container;
    },
    getSlides(sourceDoc) {
      assert.equal(sourceDoc, doc);
      calls.push('getSlides');
      return slides;
    },
    captureSlideMutationState(sourceDoc) {
      assert.equal(sourceDoc, doc);
      calls.push('captureSlideMutationState');
      return {
        preservedActiveSlideId: 'slide-2',
        preservedSelectionIds: ['element-1']
      };
    },
    getSlideId(slide) {
      assert.equal(slide, deletedSlide);
      calls.push('getSlideId');
      return slide.id;
    },
    buildCanonicalDeck(sourceDoc) {
      assert.equal(sourceDoc, doc);
      calls.push('buildCanonicalDeck');
      return { slides: [{ id: 'slide-1' }, { id: 'slide-2' }] };
    },
    removeCanonicalSlide(deck, slideId) {
      assert.deepEqual(deck.slides.map((slide) => slide.id), ['slide-1', 'slide-2']);
      assert.equal(slideId, 'slide-2');
      calls.push('removeCanonicalSlide');
      return { slides: [deck.slides[0]] };
    },
    applyDeletion(sourceContainer, slide) {
      assert.equal(sourceContainer, container);
      assert.equal(slide, deletedSlide);
      slides = [firstSlide];
      calls.push('applyDeletion');
      return { didApply: true, transaction: { type: 'markup' } };
    },
    generateThumbnails() {
      calls.push('generateThumbnails');
    },
    restoreDeckViewAfterSlideMutation(sourceDoc, selectionIds, restoreOptions) {
      assert.equal(sourceDoc, doc);
      assert.deepEqual(selectionIds, ['element-1']);
      assert.deepEqual(restoreOptions, {
        preservedActiveSlideId: 'slide-2',
        removedSlideId: 'slide-2',
        fallbackIndex: 0
      });
      calls.push('restoreDeckViewAfterSlideMutation');
    },
    finalizeMutation(label, transaction, canonicalDeck) {
      assert.equal(label, 'Auto: Deleted Slide');
      assert.deepEqual(transaction, { type: 'markup' });
      assert.deepEqual(canonicalDeck.slides.map((slide) => slide.id), ['slide-1']);
      calls.push('finalizeMutation');
    }
  });

  assert.equal(result, true);
  assert.deepEqual(calls, [
    'getIframeDoc',
    'getSlideContainer',
    'getSlides',
    'captureSlideMutationState',
    'getSlideId',
    'buildCanonicalDeck',
    'removeCanonicalSlide',
    'applyDeletion',
    'generateThumbnails',
    'getSlides',
    'restoreDeckViewAfterSlideMutation',
    'finalizeMutation'
  ]);
});

test('deleteStudioSlideNode rejects deleting the final slide without mutation', () => {
  const calls = [];

  assert.equal(slideCommands.deleteStudioSlideNode(0, {
    getIframeDoc: () => ({}),
    getSlideContainer: () => ({}),
    getSlides: () => [{ id: 'slide-1' }],
    alert(message) {
      calls.push(message);
    },
    applyDeletion() {
      calls.push('applyDeletion');
      return { didApply: true };
    }
  }), false);
  assert.deepEqual(calls, ['Action aborted: presentation requires at least one slide.']);
});

test('reorderStudioSlideNodes preserves insertion target, canonical order, and active-view restoration', () => {
  const doc = { id: 'editor-doc' };
  const container = { id: 'slides-container' };
  const firstSlide = { id: 'slide-1', nextSibling: null };
  const secondSlide = { id: 'slide-2', nextSibling: null };
  const thirdSlide = { id: 'slide-3', nextSibling: null };
  let slides = [firstSlide, secondSlide, thirdSlide];
  Object.defineProperty(firstSlide, 'nextSibling', { get: () => slides[1] || null });
  Object.defineProperty(secondSlide, 'nextSibling', { get: () => slides[2] || null });
  Object.defineProperty(thirdSlide, 'nextSibling', { get: () => null });
  const calls = [];

  const result = slideCommands.reorderStudioSlideNodes(0, 2, {
    getIframeDoc: () => doc,
    getSlideContainer: () => container,
    getSlides: () => slides,
    getSlideId: (slide) => slide.id,
    buildCanonicalDeck() {
      calls.push('buildCanonicalDeck');
      return { slides: [{ id: 'slide-1' }, { id: 'slide-2' }, { id: 'slide-3' }] };
    },
    reorderCanonicalSlides(deck, sourceId, targetId) {
      assert.equal(sourceId, 'slide-1');
      assert.equal(targetId, 'slide-3');
      calls.push('reorderCanonicalSlides');
      return { slides: [{ id: 'slide-2' }, { id: 'slide-3' }, { id: 'slide-1' }] };
    },
    captureSlideMutationState() {
      calls.push('captureSlideMutationState');
      return {
        preservedActiveSlideId: 'slide-2',
        preservedSelectionIds: ['element-1']
      };
    },
    applyReorder(sourceContainer, draggedNode, beforeNode) {
      assert.equal(sourceContainer, container);
      assert.equal(draggedNode, firstSlide);
      assert.equal(beforeNode, null);
      slides = [secondSlide, thirdSlide, firstSlide];
      calls.push('applyReorder');
      return { didApply: true, transaction: { type: 'markup' } };
    },
    generateThumbnails() {
      calls.push('generateThumbnails');
    },
    restoreDeckViewAfterSlideMutation(sourceDoc, selectionIds, restoreOptions) {
      assert.equal(sourceDoc, doc);
      assert.deepEqual(selectionIds, ['element-1']);
      assert.deepEqual(restoreOptions, {
        preservedActiveSlideId: 'slide-2',
        fallbackIndex: 2
      });
      calls.push('restoreDeckViewAfterSlideMutation');
    },
    finalizeMutation(label, transaction, canonicalDeck) {
      assert.equal(label, 'Auto: Reordered Slides');
      assert.deepEqual(transaction, { type: 'markup' });
      assert.deepEqual(canonicalDeck.slides.map((slide) => slide.id), ['slide-2', 'slide-3', 'slide-1']);
      calls.push('finalizeMutation');
    }
  });

  assert.equal(result, true);
  assert.deepEqual(calls, [
    'buildCanonicalDeck',
    'reorderCanonicalSlides',
    'captureSlideMutationState',
    'applyReorder',
    'generateThumbnails',
    'restoreDeckViewAfterSlideMutation',
    'finalizeMutation'
  ]);
});
