const test = require('node:test');
const assert = require('node:assert/strict');
const duplicationController = require('../shared/studio-editor-slide-duplication-controller.js');

test('slide duplication controller assembles canonical and editor mutation dependencies', () => {
  const calls = [];
  const liveCanonicalDeck = { id: 'live-baseline' };
  const legacyCanonicalDeck = { slides: [] };
  const controller = duplicationController.createStudioEditorSlideDuplicationController({
    slideCommandsApi: {
      duplicateStudioSlideNode(options) {
        calls.push(options);
        return true;
      }
    },
    canonicalSlideApi: {
      createStudioCanonicalDuplicateSlideMutationBuilders(options) {
        calls.push(['builders', options]);
        return {
          buildCanonicalDuplicateSlideBaseline: () => ({ id: 'baseline' }),
          buildCanonicalDuplicateSlideDeck: () => ({ slides: [] })
        };
      }
    },
    deckImportApi: {
      importSlideToCanonicalSlide() {}
    },
    canonicalDeckApi: { id: 'canonical-api' },
    getCanonicalDeckBaseline: () => liveCanonicalDeck,
    getIframeDoc: () => ({ id: 'doc' }),
    resolveInsertionActionState: () => ({ canDuplicateSlide: true }),
    getSlides: () => [{ id: 'slide-1' }],
    getActiveSlide: () => ({ id: 'slide-1' }),
    sanitizeDuplicatedSubtree: () => {},
    assignSlideId: () => 'slide-2',
    makeElementsHoverable: () => {},
    buildCanonicalDeck: () => legacyCanonicalDeck,
    buildCanonicalDeckBaseline: () => ({ id: 'baseline-fallback' }),
    saveHistoryState: () => {},
    applyInsertion: () => ({ didApply: true }),
    generateThumbnails: () => {},
    setActiveSlide: () => {},
    rollbackMutation: () => {},
    finalizeMutation: () => {}
  });

  assert.equal(controller.duplicate(), true);
  assert.equal(calls[0][0], 'builders');
  assert.equal(calls[0][1].canonicalDeckApi.id, 'canonical-api');
  assert.equal(calls[0][1].buildCanonicalDeck({}), legacyCanonicalDeck);
  assert.equal(calls[0][1].buildCanonicalDeckBaseline({}).id, 'baseline-fallback');
  assert.equal(calls[0][1].getCanonicalDeckBaseline(), liveCanonicalDeck);
  assert.equal(typeof calls[0][1].importSlideToCanonicalSlide, 'function');
  const options = calls[1];
  assert.equal(options.getIframeDoc().id, 'doc');
  assert.equal(options.resolveInsertionActionState().canDuplicateSlide, true);
  assert.equal(options.getSlides()[0].id, 'slide-1');
  assert.equal(options.getActiveSlide().id, 'slide-1');
  assert.equal(typeof options.sanitizeDuplicatedSubtree, 'function');
  assert.equal(options.assignSlideId(), 'slide-2');
  assert.equal(typeof options.makeElementsHoverable, 'function');
  assert.deepEqual(options.buildCanonicalDuplicateSlideBaseline(), { id: 'baseline' });
  assert.deepEqual(options.buildCanonicalDuplicateSlideDeck(), { slides: [] });
  assert.equal(typeof options.applyInsertion, 'function');
  assert.equal(typeof options.rollbackMutation, 'function');
  assert.equal(typeof options.finalizeMutation, 'function');
});

test('slide duplication controller fails closed without a slide-command adapter', () => {
  const controller = duplicationController.createStudioEditorSlideDuplicationController({
    slideCommandsApi: null
  });

  assert.equal(controller.duplicate(), false);
});

test('slide duplication controller fails closed when canonical builder construction throws', () => {
  let duplicateCalls = 0;
  const controller = duplicationController.createStudioEditorSlideDuplicationController({
    slideCommandsApi: {
      duplicateStudioSlideNode() {
        duplicateCalls += 1;
        return true;
      }
    },
    canonicalSlideApi: {
      createStudioCanonicalDuplicateSlideMutationBuilders() {
        throw new Error('canonical builder unavailable');
      }
    }
  });

  assert.equal(controller.duplicate(), false);
  assert.equal(duplicateCalls, 0);
});
