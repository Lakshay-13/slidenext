const test = require('node:test');
const assert = require('node:assert/strict');

const slideCommands = require('../shared/studio-editor-slide-commands.js');
const studioTransaction = require('../shared/studio-editor-transaction.js');

test('slide mutations fail closed when the editor document accessor throws', () => {
  const options = {
    getIframeDoc() {
      throw new Error('editor document unavailable');
    }
  };

  assert.equal(slideCommands.duplicateStudioSlideNode(options), false);
  assert.equal(slideCommands.addStudioSlideNode(options), false);
  assert.equal(slideCommands.deleteStudioSlideNode(0, options), false);
  assert.equal(slideCommands.reorderStudioSlideNodes(0, 1, options), false);
});

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

test('duplicateStudioSlideNode preserves canonical duplication and mutation lifecycle ordering', () => {
  const doc = { id: 'editor-doc' };
  const sourceSlide = {
    classList: {
      remove(className) {
        assert.equal(className, 'slide-active');
      }
    },
    cloneNode(deep) {
      assert.equal(deep, true);
      return duplicateSlide;
    }
  };
  const duplicateSlide = {
    classList: {
      remove(className) {
        assert.equal(className, 'slide-active');
      }
    }
  };
  const targetSlide = { id: 'slide-3' };
  const slides = [sourceSlide, targetSlide];
  const container = { id: 'slides-container' };
  const importSlideToCanonicalSlide = () => ({ id: 'slide-2' });
  const calls = [];

  const result = slideCommands.duplicateStudioSlideNode({
    getIframeDoc() {
      calls.push('getIframeDoc');
      return doc;
    },
    resolveInsertionActionState(sourceDoc) {
      assert.equal(sourceDoc, doc);
      calls.push('resolveInsertionActionState');
      return { canDuplicateSlide: true };
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
    getActiveSlide(sourceDoc) {
      assert.equal(sourceDoc, doc);
      calls.push('getActiveSlide');
      return sourceSlide;
    },
    sanitizeDuplicatedSubtree(slide) {
      assert.equal(slide, duplicateSlide);
      calls.push('sanitizeDuplicatedSubtree');
    },
    assignSlideId(slide, options) {
      assert.equal(slide, duplicateSlide);
      assert.deepEqual(options, { forceNew: true });
      calls.push('assignSlideId');
      return 'slide-2';
    },
    makeElementsHoverable(slide) {
      assert.equal(slide, duplicateSlide);
      calls.push('makeElementsHoverable');
    },
    buildCanonicalDuplicateSlideBaseline(options) {
      assert.equal(options.sourceDocument, doc);
      calls.push('buildCanonicalDuplicateSlideBaseline');
      return { slides: [{ id: 'slide-1' }, { id: 'slide-3' }] };
    },
    buildCanonicalDuplicateSlideDeck(options) {
      assert.equal(options.sourceDocument, doc);
      assert.equal(options.duplicateSlide, duplicateSlide);
      assert.equal(options.duplicateSlideId, 'slide-2');
      assert.equal(options.insertionIndex, 1);
      assert.equal(options.title, 'Slide 2');
      assert.equal(options.importSlideToCanonicalSlide, importSlideToCanonicalSlide);
      assert.deepEqual(options.canonicalDeckBeforeMutation.slides.map((slide) => slide.id), ['slide-1', 'slide-3']);
      calls.push('buildCanonicalDuplicateSlideDeck');
      return { slides: [{ id: 'slide-1' }, { id: 'slide-2' }, { id: 'slide-3' }] };
    },
    importSlideToCanonicalSlide,
    saveHistoryState(debounce, transaction, canonicalDeck) {
      assert.equal(debounce, false);
      assert.equal(transaction, null);
      assert.deepEqual(canonicalDeck.slides.map((slide) => slide.id), ['slide-1', 'slide-3']);
      calls.push('saveHistoryState');
    },
    applyInsertion(sourceContainer, slide, options) {
      assert.equal(sourceContainer, container);
      assert.equal(slide, duplicateSlide);
      assert.equal(options.beforeNode, targetSlide);
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
      assert.equal(label, 'Auto: Duplicated Slide');
      assert.deepEqual(transaction, { type: 'markup' });
      assert.deepEqual(canonicalDeck.slides.map((slide) => slide.id), ['slide-1', 'slide-2', 'slide-3']);
      calls.push('finalizeMutation');
    }
  });

  assert.equal(result, true);
  assert.deepEqual(calls, [
    'getIframeDoc',
    'resolveInsertionActionState',
    'getSlideContainer',
    'getSlides',
    'getActiveSlide',
    'sanitizeDuplicatedSubtree',
    'assignSlideId',
    'makeElementsHoverable',
    'buildCanonicalDuplicateSlideBaseline',
    'buildCanonicalDuplicateSlideDeck',
    'saveHistoryState',
    'applyInsertion',
    'generateThumbnails',
    'setActiveSlide',
    'finalizeMutation'
  ]);
});

test('duplicateStudioSlideNode prefers a scoped slide-presence transaction when the clone is serializable', () => {
  const doc = { id: 'editor-doc' };
  const sourceSlide = {
    classList: { remove() {} },
    cloneNode() {
      return duplicateSlide;
    }
  };
  const duplicateSlide = {
    outerHTML: '<section id="slide-2" class="slide"></section>',
    classList: { remove() {} }
  };
  const targetSlide = { id: 'slide-3' };
  const slides = [sourceSlide, targetSlide];
  const finalizedTransactions = [];

  const result = slideCommands.duplicateStudioSlideNode({
    getIframeDoc: () => doc,
    resolveInsertionActionState: () => ({ canDuplicateSlide: true }),
    getSlideContainer: () => ({ id: 'slides-container' }),
    getSlides: () => slides,
    getActiveSlide: () => sourceSlide,
    assignSlideId: () => 'slide-2',
    applyInsertion: () => ({ didApply: true, transaction: { type: 'legacy-markup' } }),
    createStudioSlidePresenceTransaction: studioTransaction.createStudioSlidePresenceTransaction,
    finalizeMutation: (label, transaction) => {
      assert.equal(label, 'Auto: Duplicated Slide');
      finalizedTransactions.push(transaction);
    }
  });

  assert.equal(result, true);
  assert.deepEqual(finalizedTransactions, [{
    kind: 'slidenext.editor.transaction',
    version: 1,
    operations: [{
      type: 'slide-presence',
      slideId: 'slide-2',
      before: { exists: false, index: 1, markup: '' },
      after: {
        exists: true,
        index: 1,
        markup: '<section id="slide-2" class="slide"></section>'
      }
    }]
  }]);
});

test('duplicateStudioSlideNode fails closed before DOM insertion when canonical duplication is unavailable', () => {
  const doc = { id: 'editor-doc' };
  const duplicateSlide = { classList: { remove() {} } };
  const sourceSlide = {
    classList: { remove() {} },
    cloneNode() {
      return duplicateSlide;
    }
  };
  const container = { id: 'slides-container' };
  let saveCalls = 0;
  let insertionCalls = 0;

  const result = slideCommands.duplicateStudioSlideNode({
    getIframeDoc: () => doc,
    resolveInsertionActionState: () => ({ canDuplicateSlide: true }),
    getSlideContainer: () => container,
    getSlides: () => [sourceSlide],
    getActiveSlide: () => sourceSlide,
    assignSlideId: () => 'slide-2',
    buildCanonicalDuplicateSlideBaseline: () => ({ slides: [{ id: 'slide-1' }] }),
    buildCanonicalDuplicateSlideDeck: () => null,
    saveHistoryState: () => {
      saveCalls += 1;
    },
    applyInsertion: () => {
      insertionCalls += 1;
      return { didApply: true, transaction: null };
    }
  });

  assert.equal(result, false);
  assert.equal(saveCalls, 0);
  assert.equal(insertionCalls, 0);
});

test('duplicateStudioSlideNode stops before DOM insertion when history baseline capture fails', () => {
  const sourceSlide = { classList: { remove() {} }, cloneNode: () => ({ classList: { remove() {} } }) };
  const calls = [];

  const result = slideCommands.duplicateStudioSlideNode({
    getIframeDoc: () => ({}),
    resolveInsertionActionState: () => ({ canDuplicateSlide: true }),
    getSlideContainer: () => ({}),
    getSlides: () => [sourceSlide],
    getActiveSlide: () => sourceSlide,
    assignSlideId: () => 'slide-2',
    buildCanonicalDuplicateSlideBaseline: () => ({ slides: [{ id: 'slide-1' }] }),
    buildCanonicalDuplicateSlideDeck: () => ({ slides: [{ id: 'slide-1' }, { id: 'slide-2' }] }),
    saveHistoryState: () => {
      throw new Error('history unavailable');
    },
    applyInsertion: () => {
      calls.push('applyInsertion');
      return { didApply: true };
    }
  });

  assert.equal(result, false);
  assert.deepEqual(calls, []);
});

test('duplicateStudioSlideNode rolls back DOM and active slide when persistence throws', () => {
  const doc = { id: 'editor-doc' };
  const sourceSlide = {
    id: 'slide-1',
    classList: { remove() {} },
    cloneNode() {
      return duplicateSlide;
    }
  };
  const duplicateSlide = {
    id: 'slide-2',
    outerHTML: '<section id="slide-2" class="slide"></section>',
    classList: { remove() {} }
  };
  const targetSlide = { id: 'slide-3' };
  let slides = [sourceSlide, targetSlide];
  const container = { id: 'slides-container' };
  const calls = [];

  const result = slideCommands.duplicateStudioSlideNode({
    getIframeDoc: () => doc,
    resolveInsertionActionState: () => ({ canDuplicateSlide: true }),
    getSlideContainer: () => container,
    getSlides: () => slides,
    getActiveSlide: () => sourceSlide,
    assignSlideId: () => 'slide-2',
    buildCanonicalDuplicateSlideBaseline: () => ({ slides: [{ id: 'slide-1' }, { id: 'slide-3' }] }),
    buildCanonicalDuplicateSlideDeck: () => ({ slides: [{ id: 'slide-1' }, { id: 'slide-2' }, { id: 'slide-3' }] }),
    saveHistoryState: () => {},
    createStudioSlidePresenceTransaction: studioTransaction.createStudioSlidePresenceTransaction,
    applyInsertion: () => {
      slides = [sourceSlide, duplicateSlide, targetSlide];
      return { didApply: true, transaction: { type: 'markup' } };
    },
    generateThumbnails: () => calls.push('generateThumbnails'),
    setActiveSlide: (index) => calls.push(['setActiveSlide', index]),
    finalizeMutation: () => {
      throw new Error('duplicate slide finalization failed');
    },
    rollbackMutation: (transaction, sourceDoc) => {
      assert.equal(transaction.operations[0].type, 'slide-presence');
      assert.equal(transaction.operations[0].slideId, 'slide-2');
      assert.equal(sourceDoc, doc);
      slides = [sourceSlide, targetSlide];
      calls.push('rollbackMutation');
    }
  });

  assert.equal(result, false);
  assert.deepEqual(slides, [sourceSlide, targetSlide]);
  assert.deepEqual(calls, [
    'generateThumbnails',
    ['setActiveSlide', 1],
    'rollbackMutation',
    'generateThumbnails',
    ['setActiveSlide', 0]
  ]);
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
    buildCanonicalAddSlideBaseline(options) {
      assert.equal(options.sourceDocument, doc);
      calls.push('buildCanonicalAddSlideBaseline');
      return { slides: [{ id: 'slide-1' }] };
    },
    buildCanonicalAddSlideDeck(options) {
      assert.equal(options.sourceDocument, doc);
      assert.equal(options.newSlide, newSlide);
      assert.equal(options.insertionIndex, 1);
      assert.deepEqual(options.canonicalDeckBeforeMutation.slides.map((slide) => slide.id), ['slide-1']);
      calls.push('buildCanonicalAddSlideDeck');
      return { slides: [{ id: 'slide-1' }, { id: 'slide-2' }] };
    },
    saveHistoryState(debounce, transaction, canonicalDeck) {
      assert.equal(debounce, false);
      assert.equal(transaction, null);
      assert.deepEqual(canonicalDeck.slides.map((slide) => slide.id), ['slide-1']);
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
    'buildCanonicalAddSlideBaseline',
    'buildCanonicalAddSlideDeck',
    'saveHistoryState',
    'applyInsertion',
    'generateThumbnails',
    'setActiveSlide',
    'finalizeMutation'
  ]);
});

test('addStudioSlideNode prefers a scoped slide-presence transaction when the new slide is serializable', () => {
  const doc = { id: 'editor-doc' };
  const container = { id: 'slides-container' };
  const newSlide = { id: 'slide-2', outerHTML: '<section id="slide-2"></section>' };
  let finalizedTransaction = null;

  const result = slideCommands.addStudioSlideNode({
    getIframeDoc: () => doc,
    resolveInsertionActionState: () => ({ canAddSlide: true }),
    getSlideContainer: () => container,
    getSlides: () => [{ id: 'slide-1' }],
    getSlideId: (slide) => slide.id,
    createBlankSlide: () => newSlide,
    buildCanonicalAddSlideBaseline: () => null,
    buildCanonicalAddSlideDeck: () => null,
    applyInsertion: () => ({ didApply: true, transaction: { type: 'markup' } }),
    createStudioSlidePresenceTransaction: studioTransaction.createStudioSlidePresenceTransaction,
    finalizeMutation: (_label, transaction) => {
      finalizedTransaction = transaction;
    }
  });

  assert.equal(result, true);
  assert.deepEqual(finalizedTransaction.operations, [{
    type: 'slide-presence',
    slideId: 'slide-2',
    before: { exists: false, index: 1, markup: '' },
    after: { exists: true, index: 1, markup: '<section id="slide-2"></section>' }
  }]);
});

test('addStudioSlideNode fails closed before DOM insertion when canonical addition is unavailable', () => {
  const doc = { id: 'editor-doc' };
  const container = { id: 'slides-container' };
  const newSlide = { id: 'slide-2' };
  let saveCalls = 0;
  let insertionCalls = 0;

  const result = slideCommands.addStudioSlideNode({
    getIframeDoc: () => doc,
    resolveInsertionActionState: () => ({ canAddSlide: true }),
    getSlideContainer: () => container,
    getSlides: () => [{ id: 'slide-1' }],
    createBlankSlide: () => newSlide,
    buildCanonicalAddSlideBaseline: () => ({ slides: [{ id: 'slide-1' }] }),
    buildCanonicalAddSlideDeck: () => null,
    saveHistoryState: () => {
      saveCalls += 1;
    },
    applyInsertion: () => {
      insertionCalls += 1;
      return { didApply: true, transaction: null };
    }
  });

  assert.equal(result, false);
  assert.equal(saveCalls, 0);
  assert.equal(insertionCalls, 0);
});

test('addStudioSlideNode stops before DOM insertion when history baseline capture fails', () => {
  const calls = [];

  const result = slideCommands.addStudioSlideNode({
    getIframeDoc: () => ({}),
    resolveInsertionActionState: () => ({ canAddSlide: true }),
    getSlideContainer: () => ({}),
    getSlides: () => [{ id: 'slide-1' }],
    createBlankSlide: () => ({ id: 'slide-2' }),
    buildCanonicalAddSlideBaseline: () => ({ slides: [{ id: 'slide-1' }] }),
    buildCanonicalAddSlideDeck: () => ({ slides: [{ id: 'slide-1' }, { id: 'slide-2' }] }),
    saveHistoryState: () => {
      throw new Error('history unavailable');
    },
    applyInsertion: () => {
      calls.push('applyInsertion');
      return { didApply: true };
    }
  });

  assert.equal(result, false);
  assert.deepEqual(calls, []);
});

test('addStudioSlideNode stops before DOM insertion when injected history capture fails', () => {
  let insertionCalls = 0;

  const result = slideCommands.addStudioSlideNode({
    getIframeDoc: () => ({}),
    resolveInsertionActionState: () => ({ canAddSlide: true }),
    getSlideContainer: () => ({}),
    getSlides: () => [{ id: 'slide-1' }],
    createBlankSlide: () => ({ id: 'slide-2' }),
    captureSlideMutationState: () => ({ historyCaptureFailed: true }),
    applyInsertion: () => {
      insertionCalls += 1;
      return { didApply: true };
    }
  });

  assert.equal(result, false);
  assert.equal(insertionCalls, 0);
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

test('addStudioSlideNode rolls back DOM and active slide when persistence rejects', () => {
  const doc = { id: 'editor-doc' };
  const container = { id: 'slides-container' };
  const firstSlide = { id: 'slide-1' };
  const newSlide = { id: 'slide-2' };
  let slides = [firstSlide];
  const calls = [];

  const result = slideCommands.addStudioSlideNode({
    getIframeDoc: () => doc,
    resolveInsertionActionState: () => ({ canAddSlide: true }),
    getSlideContainer: () => container,
    getSlides: () => slides,
    createBlankSlide: () => newSlide,
    buildCanonicalAddSlideBaseline: () => ({ slides: [{ id: 'slide-1' }] }),
    buildCanonicalAddSlideDeck: () => ({ slides: [{ id: 'slide-1' }, { id: 'slide-2' }] }),
    captureSlideMutationState: () => ({
      preservedActiveSlideId: 'slide-1',
      preservedSelectionIds: ['element-1']
    }),
    applyInsertion: () => {
      slides = [firstSlide, newSlide];
      return { didApply: true, transaction: { type: 'markup' } };
    },
    generateThumbnails: () => calls.push('generateThumbnails'),
    setActiveSlide: (index) => calls.push(['setActiveSlide', index]),
    finalizeMutation: () => false,
    rollbackMutation: (transaction, sourceDoc) => {
      assert.deepEqual(transaction, { type: 'markup' });
      assert.equal(sourceDoc, doc);
      slides = [firstSlide];
      calls.push('rollbackMutation');
    },
    restoreDeckViewAfterSlideMutation: (sourceDoc, selectionIds, options) => {
      assert.equal(sourceDoc, doc);
      assert.deepEqual(selectionIds, ['element-1']);
      assert.equal(options.preservedActiveSlideId, 'slide-1');
      assert.equal(options.fallbackIndex, 0);
      calls.push('restoreDeckViewAfterSlideMutation');
    }
  });

  assert.equal(result, false);
  assert.deepEqual(slides, [firstSlide]);
  assert.deepEqual(calls, [
    'generateThumbnails',
    ['setActiveSlide', 1],
    'rollbackMutation',
    'generateThumbnails',
    'restoreDeckViewAfterSlideMutation'
  ]);
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
    buildCanonicalDeleteSlideDeck(options) {
      assert.equal(options.sourceDocument, doc);
      assert.equal(options.deletedSlide, deletedSlide);
      assert.equal(options.slideId, 'slide-2');
      calls.push('buildCanonicalDeleteSlideDeck');
      return { slides: [{ id: 'slide-1' }] };
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
    'buildCanonicalDeleteSlideDeck',
    'applyDeletion',
    'generateThumbnails',
    'getSlides',
    'restoreDeckViewAfterSlideMutation',
    'finalizeMutation'
  ]);
});

test('deleteStudioSlideNode fails closed before DOM removal when canonical deletion is unavailable', () => {
  const doc = { id: 'editor-doc' };
  const container = { id: 'slides-container' };
  const firstSlide = { id: 'slide-1' };
  const deletedSlide = { id: 'slide-2' };
  let deletionCalls = 0;

  const result = slideCommands.deleteStudioSlideNode(1, {
    getIframeDoc: () => doc,
    getSlideContainer: () => container,
    getSlides: () => [firstSlide, deletedSlide],
    captureSlideMutationState: () => ({
      preservedActiveSlideId: 'slide-2',
      preservedSelectionIds: []
    }),
    getSlideId: (slide) => slide.id,
    buildCanonicalDeleteSlideBaseline: () => ({ slides: [{ id: 'slide-1' }, { id: 'slide-2' }] }),
    buildCanonicalDeleteSlideDeck: () => null,
    applyDeletion: () => {
      deletionCalls += 1;
      return { didApply: true, transaction: null };
    }
  });

  assert.equal(result, false);
  assert.equal(deletionCalls, 0);
});

test('deleteStudioSlideNode stops before DOM removal when history baseline capture fails', () => {
  const firstSlide = { id: 'slide-1' };
  const deletedSlide = { id: 'slide-2' };
  const calls = [];

  const result = slideCommands.deleteStudioSlideNode(1, {
    getIframeDoc: () => ({}),
    getSlideContainer: () => ({}),
    getSlides: () => [firstSlide, deletedSlide],
    captureSlideMutationState: () => ({ historyCaptureFailed: true }),
    getSlideId: (slide) => slide.id,
    buildCanonicalDeleteSlideDeck: () => ({ slides: [{ id: 'slide-1' }] }),
    applyDeletion: () => {
      calls.push('applyDeletion');
      return { didApply: true };
    }
  });

  assert.equal(result, false);
  assert.deepEqual(calls, []);
});

test('deleteStudioSlideNode rolls back DOM and view state when persistence rejects', () => {
  const doc = { id: 'editor-doc' };
  const container = { id: 'slides-container' };
  const firstSlide = { id: 'slide-1' };
  const deletedSlide = { id: 'slide-2' };
  let slides = [firstSlide, deletedSlide];
  const calls = [];

  const result = slideCommands.deleteStudioSlideNode(1, {
    getIframeDoc: () => doc,
    getSlideContainer: () => container,
    getSlides: () => slides,
    captureSlideMutationState: () => ({
      preservedActiveSlideId: 'slide-2',
      preservedSelectionIds: ['element-1']
    }),
    getSlideId: (slide) => slide.id,
    buildCanonicalDeleteSlideBaseline: () => ({ slides: [{ id: 'slide-1' }, { id: 'slide-2' }] }),
    buildCanonicalDeleteSlideDeck: () => ({ slides: [{ id: 'slide-1' }] }),
    applyDeletion: () => {
      slides = [firstSlide];
      return { didApply: true, transaction: { type: 'markup' } };
    },
    finalizeMutation: () => false,
    rollbackMutation: (transaction, sourceDoc) => {
      assert.deepEqual(transaction, { type: 'markup' });
      assert.equal(sourceDoc, doc);
      slides = [firstSlide, deletedSlide];
      calls.push('rollbackMutation');
    },
    generateThumbnails: () => calls.push('generateThumbnails'),
    restoreDeckViewAfterSlideMutation: (sourceDoc, selectionIds, options) => {
      assert.equal(sourceDoc, doc);
      assert.deepEqual(selectionIds, ['element-1']);
      assert.equal(options.preservedActiveSlideId, 'slide-2');
      if (calls.includes('rollbackMutation')) {
        assert.equal(options.removedSlideId, undefined);
        assert.equal(options.fallbackIndex, 1);
      } else {
        assert.equal(options.removedSlideId, 'slide-2');
        assert.equal(options.fallbackIndex, 0);
      }
      calls.push('restoreDeckViewAfterSlideMutation');
    }
  });

  assert.equal(result, false);
  assert.deepEqual(slides, [firstSlide, deletedSlide]);
  assert.deepEqual(calls, [
    'generateThumbnails',
    'restoreDeckViewAfterSlideMutation',
    'rollbackMutation',
    'generateThumbnails',
    'restoreDeckViewAfterSlideMutation'
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
    buildCanonicalReorderSlideDeck(options) {
      assert.equal(options.sourceDocument, doc);
      assert.equal(options.sourceSlide, firstSlide);
      assert.equal(options.targetSlide, thirdSlide);
      calls.push('buildCanonicalReorderSlideDeck');
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
    'buildCanonicalReorderSlideDeck',
    'captureSlideMutationState',
    'applyReorder',
    'generateThumbnails',
    'restoreDeckViewAfterSlideMutation',
    'finalizeMutation'
  ]);
});

test('reorderStudioSlideNodes prefers a structured slide-order transaction when ids are available', () => {
  const doc = { id: 'editor-doc' };
  const container = { id: 'slides-container' };
  const firstSlide = { id: 'slide-1', nextSibling: null };
  const secondSlide = { id: 'slide-2', nextSibling: null };
  let slides = [firstSlide, secondSlide];
  let finalizedTransaction = null;

  const result = slideCommands.reorderStudioSlideNodes(0, 1, {
    getIframeDoc: () => doc,
    getSlideContainer: () => container,
    getSlides: () => slides,
    getSlideId: (slide) => slide.id,
    createStudioSlideOrderTransaction: studioTransaction.createStudioSlideOrderTransaction,
    buildCanonicalReorderSlideDeck: () => ({ slides: [{ id: 'slide-2' }, { id: 'slide-1' }] }),
    captureSlideMutationState: () => ({}),
    applyReorder: () => {
      slides = [secondSlide, firstSlide];
      return { didApply: true, transaction: { type: 'legacy-markup' } };
    },
    finalizeMutation: (_label, nextTransaction) => {
      finalizedTransaction = nextTransaction;
    }
  });

  assert.equal(result, true);
  assert.deepEqual(finalizedTransaction.operations, [{
    type: 'slide-order',
    before: ['slide-1', 'slide-2'],
    after: ['slide-2', 'slide-1']
  }]);
});

test('reorderStudioSlideNodes fails closed before DOM reorder when canonical reordering is unavailable', () => {
  const doc = { id: 'editor-doc' };
  const container = { id: 'slides-container' };
  const firstSlide = { id: 'slide-1' };
  const secondSlide = { id: 'slide-2' };
  let reorderCalls = 0;

  const result = slideCommands.reorderStudioSlideNodes(0, 1, {
    getIframeDoc: () => doc,
    getSlideContainer: () => container,
    getSlides: () => [firstSlide, secondSlide],
    buildCanonicalReorderSlideBaseline: () => ({ slides: [{ id: 'slide-1' }, { id: 'slide-2' }] }),
    buildCanonicalReorderSlideDeck: () => null,
    applyReorder: () => {
      reorderCalls += 1;
      return { didApply: true, transaction: null };
    }
  });

  assert.equal(result, false);
  assert.equal(reorderCalls, 0);
});

test('reorderStudioSlideNodes stops before DOM reorder when history baseline capture fails', () => {
  const calls = [];

  const result = slideCommands.reorderStudioSlideNodes(0, 1, {
    getIframeDoc: () => ({}),
    getSlideContainer: () => ({}),
    getSlides: () => [{ id: 'slide-1' }, { id: 'slide-2' }],
    buildCanonicalReorderSlideDeck: () => ({ slides: [{ id: 'slide-2' }, { id: 'slide-1' }] }),
    captureSlideMutationState: () => ({ historyCaptureFailed: true }),
    applyReorder: () => {
      calls.push('applyReorder');
      return { didApply: true };
    }
  });

  assert.equal(result, false);
  assert.deepEqual(calls, []);
});

test('reorderStudioSlideNodes rolls back DOM and view state when persistence rejects', () => {
  const doc = { id: 'editor-doc' };
  const container = { id: 'slides-container' };
  const firstSlide = { id: 'slide-1', nextSibling: null };
  const secondSlide = { id: 'slide-2', nextSibling: null };
  let slides = [firstSlide, secondSlide];
  const calls = [];

  const result = slideCommands.reorderStudioSlideNodes(0, 1, {
    getIframeDoc: () => doc,
    getSlideContainer: () => container,
    getSlides: () => slides,
    buildCanonicalReorderSlideBaseline: () => ({ slides: [{ id: 'slide-1' }, { id: 'slide-2' }] }),
    buildCanonicalReorderSlideDeck: () => ({ slides: [{ id: 'slide-2' }, { id: 'slide-1' }] }),
    captureSlideMutationState: () => ({
      preservedActiveSlideId: 'slide-1',
      preservedSelectionIds: ['element-1']
    }),
    applyReorder: () => {
      slides = [secondSlide, firstSlide];
      return { didApply: true, transaction: { type: 'markup' } };
    },
    finalizeMutation: () => false,
    rollbackMutation: (transaction, sourceDoc) => {
      assert.deepEqual(transaction, { type: 'markup' });
      assert.equal(sourceDoc, doc);
      slides = [firstSlide, secondSlide];
      calls.push('rollbackMutation');
    },
    generateThumbnails: () => calls.push('generateThumbnails'),
    restoreDeckViewAfterSlideMutation: (sourceDoc, selectionIds, options) => {
      assert.equal(sourceDoc, doc);
      assert.deepEqual(selectionIds, ['element-1']);
      assert.equal(options.preservedActiveSlideId, 'slide-1');
      assert.equal(options.fallbackIndex, calls.includes('rollbackMutation') ? 0 : 1);
      calls.push('restoreDeckViewAfterSlideMutation');
    }
  });

  assert.equal(result, false);
  assert.deepEqual(slides, [firstSlide, secondSlide]);
  assert.deepEqual(calls, [
    'generateThumbnails',
    'restoreDeckViewAfterSlideMutation',
    'rollbackMutation',
    'generateThumbnails',
    'restoreDeckViewAfterSlideMutation'
  ]);
});

test('applyStudioSlideInsertionWithTransaction delegates the shared slide mutation and preserves options', () => {
  const container = { id: 'slides-container' };
  const slideNode = { id: 'slide-2' };
  const beforeNode = { id: 'slide-3' };
  let delegatedOptions = null;
  const result = slideCommands.applyStudioSlideInsertionWithTransaction(container, slideNode, {
    applyStudioSlideInsertionMutation(sourceContainer, sourceSlide, options) {
      assert.equal(sourceContainer, container);
      assert.equal(sourceSlide, slideNode);
      delegatedOptions = options;
      return { didApply: true, transaction: { type: 'markup' } };
    },
    createStudioMarkupTransactionCapture() {},
    containerElementId: 'deck-slides',
    beforeNode,
    getElementId() {}
  });

  assert.deepEqual(result, {
    didApply: true,
    transaction: { type: 'markup' }
  });
  assert.equal(delegatedOptions.containerElementId, 'deck-slides');
  assert.equal(delegatedOptions.beforeNode, beforeNode);
  assert.equal(typeof delegatedOptions.createMarkupTransactionCapture, 'function');
});

test('applyStudioSlideInsertionWithTransaction uses the fallback insertion and markup transaction', () => {
  const slideNode = { id: 'slide-2' };
  const beforeNode = { id: 'slide-3' };
  const container = {
    id: 'slides-container',
    innerHTML: '<section data-slide-id="slide-1"></section><section data-slide-id="slide-3"></section>',
    insertBefore(node, sibling) {
      assert.equal(node, slideNode);
      assert.equal(sibling, beforeNode);
      this.innerHTML = '<section data-slide-id="slide-1"></section><section data-slide-id="slide-2"></section><section data-slide-id="slide-3"></section>';
      return node;
    }
  };

  const result = slideCommands.applyStudioSlideInsertionWithTransaction(container, slideNode, {
    beforeNode,
    createStudioMarkupTransactionCapture(items, options) {
      return studioTransaction.createStudioMarkupTransactionCapture(items, options);
    }
  });

  assert.equal(result.didApply, true);
  assert.equal(result.transaction.operations[0].elementId, 'slides-container');
  assert.equal(result.transaction.operations[0].after, '<section data-slide-id="slide-1"></section><section data-slide-id="slide-2"></section><section data-slide-id="slide-3"></section>');
});

test('applyStudioSlideDeletionWithTransaction delegates the shared slide mutation and preserves options', () => {
  const container = { id: 'slides-container' };
  const slideNode = { id: 'slide-2' };
  let delegatedOptions = null;
  const result = slideCommands.applyStudioSlideDeletionWithTransaction(container, slideNode, {
    applyStudioSlideDeletionMutation(sourceContainer, sourceSlide, options) {
      assert.equal(sourceContainer, container);
      assert.equal(sourceSlide, slideNode);
      delegatedOptions = options;
      return { didApply: true, transaction: { type: 'markup' } };
    },
    createStudioMarkupTransactionCapture() {},
    containerElementId: 'deck-slides',
    getElementId() {}
  });

  assert.deepEqual(result, {
    didApply: true,
    transaction: { type: 'markup' }
  });
  assert.equal(delegatedOptions.containerElementId, 'deck-slides');
  assert.equal(typeof delegatedOptions.createMarkupTransactionCapture, 'function');
});

test('applyStudioSlideDeletionWithTransaction uses the fallback remove and markup transaction', () => {
  const container = {
    id: 'slides-container',
    innerHTML: '<section data-slide-id="slide-1"></section><section data-slide-id="slide-2"></section>'
  };
  const slideNode = {
    remove() {
      container.innerHTML = '<section data-slide-id="slide-1"></section>';
    }
  };

  const result = slideCommands.applyStudioSlideDeletionWithTransaction(container, slideNode, {
    createStudioMarkupTransactionCapture(items, options) {
      return studioTransaction.createStudioMarkupTransactionCapture(items, options);
    }
  });

  assert.equal(result.didApply, true);
  assert.equal(result.transaction.operations[0].elementId, 'slides-container');
  assert.equal(result.transaction.operations[0].after, '<section data-slide-id="slide-1"></section>');
});

test('applyStudioSlideReorderWithTransaction delegates the shared slide mutation and preserves target options', () => {
  const container = { id: 'slides-container' };
  const slideNode = { id: 'slide-1' };
  const beforeNode = { id: 'slide-3' };
  let delegatedOptions = null;
  const result = slideCommands.applyStudioSlideReorderWithTransaction(container, slideNode, beforeNode, {
    applyStudioSlideReorderMutation(sourceContainer, sourceSlide, targetNode, options) {
      assert.equal(sourceContainer, container);
      assert.equal(sourceSlide, slideNode);
      assert.equal(targetNode, beforeNode);
      delegatedOptions = options;
      return { didApply: true, transaction: { type: 'markup' } };
    },
    createStudioMarkupTransactionCapture() {},
    containerElementId: 'deck-slides',
    getElementId() {}
  });

  assert.deepEqual(result, {
    didApply: true,
    transaction: { type: 'markup' }
  });
  assert.equal(delegatedOptions.containerElementId, 'deck-slides');
  assert.equal(typeof delegatedOptions.createMarkupTransactionCapture, 'function');
});

test('applyStudioSlideReorderWithTransaction uses the fallback insertBefore and markup transaction', () => {
  const slideNode = { id: 'slide-3' };
  const beforeNode = { id: 'slide-1' };
  const container = {
    id: 'slides-container',
    innerHTML: '<section data-slide-id="slide-1"></section><section data-slide-id="slide-3"></section>',
    insertBefore(node, sibling) {
      assert.equal(node, slideNode);
      assert.equal(sibling, beforeNode);
      this.innerHTML = '<section data-slide-id="slide-3"></section><section data-slide-id="slide-1"></section>';
      return node;
    }
  };

  const result = slideCommands.applyStudioSlideReorderWithTransaction(container, slideNode, beforeNode, {
    createStudioMarkupTransactionCapture(items, options) {
      return studioTransaction.createStudioMarkupTransactionCapture(items, options);
    }
  });

  assert.equal(result.didApply, true);
  assert.equal(result.transaction.operations[0].elementId, 'slides-container');
  assert.equal(result.transaction.operations[0].after, '<section data-slide-id="slide-3"></section><section data-slide-id="slide-1"></section>');
});
