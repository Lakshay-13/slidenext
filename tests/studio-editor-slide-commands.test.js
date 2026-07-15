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
