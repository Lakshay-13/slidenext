const test = require('node:test');
const assert = require('node:assert/strict');
const insertionController = require('../shared/studio-editor-slide-insertion-controller.js');

test('slide insertion controller assembles canonical and editor mutation dependencies', () => {
  const calls = [];
  const liveCanonicalDeck = { id: 'live-baseline' };
  const legacyCanonicalDeck = { slides: [] };
  const controller = insertionController.createStudioEditorSlideInsertionController({
    slideCommandsApi: {
      addStudioSlideNode(options) {
        calls.push(options);
        return true;
      }
    },
    canonicalSlideApi: {
      createStudioCanonicalAddSlideMutationBuilders(options) {
        calls.push(['builders', options]);
        return {
          buildCanonicalAddSlideBaseline: () => ({ id: 'baseline' }),
          buildCanonicalAddSlideDeck: () => ({ slides: [] })
        };
      }
    },
    deckImportApi: {
      importSlideToCanonicalSlide() {}
    },
    canonicalDeckApi: { id: 'canonical-api' },
    getCanonicalDeckBaseline: () => liveCanonicalDeck,
    getIframeDoc: () => ({ id: 'doc' }),
    resolveInsertionActionState: () => ({ canAddSlide: true }),
    getSlides: () => [{ id: 'slide-1' }],
    createBlankSlide: () => ({ id: 'slide-2' }),
    buildCanonicalDeck: () => legacyCanonicalDeck,
    buildCanonicalDeckBaseline: () => ({ id: 'baseline-fallback' }),
    getSlideId: (slide) => slide.id,
    saveHistoryState: () => {},
    captureSlideMutationState: () => ({ preservedActiveSlideId: 'slide-1' }),
    applyInsertion: () => ({ didApply: true }),
    generateThumbnails: () => {},
    setActiveSlide: () => {},
    restoreDeckViewAfterSlideMutation: () => {},
    rollbackMutation: () => {},
    finalizeMutation: () => {}
  });

  assert.equal(controller.add(), true);
  assert.equal(calls[0][0], 'builders');
  assert.equal(calls[0][1].canonicalDeckApi.id, 'canonical-api');
  assert.equal(typeof calls[0][1].importSlideToCanonicalSlide, 'function');
  assert.equal(calls[0][1].buildCanonicalDeck({}), legacyCanonicalDeck);
  assert.equal(calls[0][1].buildCanonicalDeckBaseline({}).id, 'baseline-fallback');
  assert.equal(calls[0][1].getCanonicalDeckBaseline(), liveCanonicalDeck);
  const options = calls[1];
  assert.equal(options.getIframeDoc().id, 'doc');
  assert.equal(options.resolveInsertionActionState().canAddSlide, true);
  assert.equal(options.getSlides()[0].id, 'slide-1');
  assert.equal(options.createBlankSlide().id, 'slide-2');
  assert.deepEqual(options.buildCanonicalAddSlideBaseline(), { id: 'baseline' });
  assert.deepEqual(options.buildCanonicalAddSlideDeck(), { slides: [] });
  assert.equal(typeof options.applyInsertion, 'function');
  assert.equal(typeof options.captureSlideMutationState, 'function');
  assert.equal(typeof options.restoreDeckViewAfterSlideMutation, 'function');
  assert.equal(typeof options.rollbackMutation, 'function');
  assert.equal(typeof options.finalizeMutation, 'function');
});

test('slide insertion controller fails closed without a slide-command adapter', () => {
  const controller = insertionController.createStudioEditorSlideInsertionController({
    slideCommandsApi: null
  });

  assert.equal(controller.add(), false);
});

test('slide insertion controller fails closed when canonical builder construction throws', () => {
  let addCalls = 0;
  const controller = insertionController.createStudioEditorSlideInsertionController({
    slideCommandsApi: {
      addStudioSlideNode() {
        addCalls += 1;
        return true;
      }
    },
    canonicalSlideApi: {
      createStudioCanonicalAddSlideMutationBuilders() {
        throw new Error('canonical builder unavailable');
      }
    }
  });

  assert.equal(controller.add(), false);
  assert.equal(addCalls, 0);
});
