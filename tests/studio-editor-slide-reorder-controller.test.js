const test = require('node:test');
const assert = require('node:assert/strict');
const reorderController = require('../shared/studio-editor-slide-reorder-controller.js');

test('slide reorder controller assembles canonical and persistence dependencies', () => {
  const calls = [];
  const liveCanonicalDeck = { id: 'live-baseline' };
  const canonicalBuilders = {
    buildCanonicalReorderSlideBaseline() {
      calls.push(['baseline']);
      return { id: 'baseline' };
    },
    buildCanonicalReorderSlideDeck() {
      calls.push(['canonicalDeck']);
      return { slides: [] };
    }
  };
  const controller = reorderController.createStudioEditorSlideReorderController({
    slideCommandsApi: {
      createStudioCanonicalReorderSlideMutationBuilders() {
        calls.push(['builders']);
        return canonicalBuilders;
      },
      reorderStudioSlideNodes(fromIdx, toIdx, options) {
        calls.push(['reorder', fromIdx, toIdx, options]);
        return true;
      }
    },
    canonicalSlideApi: {
      createStudioCanonicalReorderSlideMutationBuilders(options) {
        calls.push(['createBuilders', options]);
        return canonicalBuilders;
      }
    },
    canonicalDeckApi: { id: 'canonical-api' },
    getCanonicalDeckBaseline: () => liveCanonicalDeck,
    getIframeDoc: () => ({ id: 'doc' }),
    getSlides: () => [{ id: 'slide-1' }],
    getSlideId: (slide) => slide.id,
    buildCanonicalDeck: () => ({ slides: [] }),
    captureSlideMutationState: () => ({ id: 'restore' }),
    applyReorder: () => ({ didApply: true }),
    generateThumbnails: () => calls.push(['thumbnails']),
    restoreDeckViewAfterSlideMutation: () => calls.push(['restore']),
    finalizeMutation: () => calls.push(['finalize'])
  });

  assert.equal(controller.reorder(0, 1), true);
  assert.equal(calls[0][0], 'createBuilders');
  assert.equal(calls[0][1].canonicalDeckApi.id, 'canonical-api');
  assert.equal(calls[0][1].buildCanonicalDeck({}).slides.length, 0);
  assert.equal(calls[0][1].getCanonicalDeckBaseline(), liveCanonicalDeck);
  assert.equal(calls[1][0], 'reorder');
  assert.equal(calls[1][1], 0);
  assert.equal(calls[1][2], 1);
  assert.equal(calls[1][3].getIframeDoc().id, 'doc');
  assert.equal(calls[1][3].getSlides()[0].id, 'slide-1');
  assert.equal(calls[1][3].getSlideId({ id: 'slide-2' }), 'slide-2');
  assert.equal(calls[1][3].captureSlideMutationState().id, 'restore');
  assert.deepEqual(
    calls[1][3].buildCanonicalReorderSlideBaseline(),
    canonicalBuilders.buildCanonicalReorderSlideBaseline()
  );
});

test('slide reorder controller fails closed without a reorder command', () => {
  const controller = reorderController.createStudioEditorSlideReorderController({
    slideCommandsApi: null
  });

  assert.equal(controller.reorder(0, 1), false);
});
