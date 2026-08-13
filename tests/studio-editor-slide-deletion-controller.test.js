const test = require('node:test');
const assert = require('node:assert/strict');
const deletionController = require('../shared/studio-editor-slide-deletion-controller.js');

test('slide deletion controller assembles canonical and editor mutation dependencies', () => {
  const calls = [];
  const liveCanonicalDeck = { id: 'live-baseline' };
  const legacyCanonicalDeck = { slides: [] };
  const controller = deletionController.createStudioEditorSlideDeletionController({
    slideCommandsApi: {
      deleteStudioSlideNode(index, options) {
        calls.push(['delete', index, options]);
        return true;
      }
    },
    canonicalSlideApi: {
      createStudioCanonicalDeleteSlideMutationBuilders(options) {
        calls.push(['builders', options]);
        return {
          buildCanonicalDeleteSlideBaseline: () => ({ id: 'baseline' }),
          buildCanonicalDeleteSlideDeck: () => ({ slides: [] })
        };
      }
    },
    canonicalDeckApi: { id: 'canonical-api' },
    transactionApi: {
      createStudioSlidePresenceTransaction() {}
    },
    getCanonicalDeckBaseline: () => liveCanonicalDeck,
    getIframeDoc: () => ({ id: 'doc' }),
    getSlides: () => [{ id: 'slide-1' }],
    alert: () => {},
    captureSlideMutationState: () => ({ preservedActiveSlideId: 'slide-1' }),
    getSlideId: (slide) => slide.id,
    buildCanonicalDeck: () => legacyCanonicalDeck,
    buildCanonicalDeckBaseline: () => ({ id: 'baseline-fallback' }),
    applyDeletion: () => ({ didApply: true }),
    generateThumbnails: () => {},
    restoreDeckViewAfterSlideMutation: () => {},
    rollbackMutation: () => {},
    finalizeMutation: () => {}
  });

  assert.equal(controller.remove(1), true);
  assert.equal(calls[0][0], 'builders');
  assert.equal(calls[0][1].canonicalDeckApi.id, 'canonical-api');
  assert.equal(calls[0][1].buildCanonicalDeck({}), legacyCanonicalDeck);
  assert.equal(calls[0][1].buildCanonicalDeckBaseline({}).id, 'baseline-fallback');
  assert.equal(calls[0][1].getCanonicalDeckBaseline(), liveCanonicalDeck);
  assert.equal(typeof calls[1][2].getIframeDoc, 'function');
  assert.equal(calls[1][2].getIframeDoc().id, 'doc');
  assert.equal(calls[1][2].getSlides()[0].id, 'slide-1');
  assert.equal(typeof calls[1][2].alert, 'function');
  assert.equal(typeof calls[1][2].captureSlideMutationState, 'function');
  assert.equal(typeof calls[1][2].getSlideId, 'function');
  assert.equal(typeof calls[1][2].createStudioSlidePresenceTransaction, 'function');
  assert.equal(typeof calls[1][2].buildCanonicalDeleteSlideBaseline, 'function');
  assert.deepEqual(calls[1][2].buildCanonicalDeleteSlideDeck(), { slides: [] });
  assert.equal(typeof calls[1][2].applyDeletion, 'function');
  assert.equal(typeof calls[1][2].rollbackMutation, 'function');
  assert.equal(typeof calls[1][2].finalizeMutation, 'function');
});

test('slide deletion controller fails closed without a slide-command adapter', () => {
  const controller = deletionController.createStudioEditorSlideDeletionController({
    slideCommandsApi: null
  });

  assert.equal(controller.remove(0), false);
});

test('slide deletion controller fails closed when canonical builder construction throws', () => {
  let deleteCalls = 0;
  const controller = deletionController.createStudioEditorSlideDeletionController({
    slideCommandsApi: {
      deleteStudioSlideNode() {
        deleteCalls += 1;
        return true;
      }
    },
    canonicalSlideApi: {
      createStudioCanonicalDeleteSlideMutationBuilders() {
        throw new Error('canonical builder unavailable');
      }
    }
  });

  assert.equal(controller.remove(0), false);
  assert.equal(deleteCalls, 0);
});
