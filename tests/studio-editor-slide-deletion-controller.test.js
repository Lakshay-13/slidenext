const test = require('node:test');
const assert = require('node:assert/strict');
const deletionController = require('../shared/studio-editor-slide-deletion-controller.js');

test('slide deletion controller assembles canonical and editor mutation dependencies', () => {
  const calls = [];
  const liveCanonicalDeck = { id: 'live-baseline' };
  const pendingCanonicalDeck = { id: 'pending-baseline' };
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
    getPendingCanonicalDeck: () => pendingCanonicalDeck,
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
  assert.equal(calls[0][1].getPendingCanonicalDeck(), pendingCanonicalDeck);
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

test('slide deletion controller owns the shared transaction adapter when available', () => {
  const container = { id: 'container' };
  const slideNode = { id: 'slide-1' };
  const mutationApi = { name: 'mutation' };
  const deckViewApi = { name: 'deck-view' };
  const transactionApi = { name: 'transaction' };
  const delegated = [];
  let legacyCalled = false;
  const slideCommandsApi = {
    applyStudioSlideDeletionWithTransaction() {},
    deleteStudioSlideNode(index, options) {
      assert.equal(index, 1);
      return options.applyDeletion(container, slideNode, {
        skipMarkupTransactionCapture: true
      }).didApply;
    }
  };
  const controller = deletionController.createStudioEditorSlideDeletionController({
    slideCommandsApi,
    deletionTransactionApi: {
      applyStudioEditorSlideDeletionMutationWithTransaction(...args) {
        delegated.push(args);
        return { didApply: true, transaction: { id: 'tx-delete' } };
      }
    },
    deletionMutationApi: mutationApi,
    deckViewApi,
    transactionApi,
    applyDeletion() {
      legacyCalled = true;
      return { didApply: false, transaction: null };
    }
  });

  assert.equal(controller.remove(1), true);
  assert.equal(legacyCalled, false);
  assert.equal(delegated.length, 1);
  assert.equal(delegated[0][0], container);
  assert.equal(delegated[0][1], slideNode);
  assert.deepEqual(delegated[0][2], {
    mutationApi,
    slideCommandsApi,
    deckViewApi,
    transactionApi,
    skipMarkupTransactionCapture: true
  });
});

test('slide deletion controller uses the shared applicator factory when available', () => {
  const calls = [];
  const controller = deletionController.createStudioEditorSlideDeletionController({
    slideCommandsApi: {
      deleteStudioSlideNode(index, options) {
        calls.push(['delete', index]);
        return options.applyDeletion('container', 'slide', { legacy: true }).didApply;
      }
    },
    deletionTransactionApi: {
      createStudioEditorSlideDeletionApplicator(options) {
        calls.push(['factory', options]);
        return (...args) => {
          calls.push(['applicator', ...args]);
          return { didApply: true, transaction: null };
        };
      }
    },
    deletionMutationApi: { id: 'mutation' },
    deckViewApi: { id: 'view' },
    transactionApi: { id: 'transaction' }
  });

  assert.equal(controller.remove(1), true);
  assert.equal(calls[0][0], 'factory');
  assert.equal(calls[0][1].mutationApi.id, 'mutation');
  assert.equal(calls[0][1].deckViewApi.id, 'view');
  assert.equal(calls[0][1].transactionApi.id, 'transaction');
  assert.equal(calls[1][0], 'delete');
  assert.deepEqual(calls[2], ['applicator', 'container', 'slide', { legacy: true }]);
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
