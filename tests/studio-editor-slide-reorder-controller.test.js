const test = require('node:test');
const assert = require('node:assert/strict');
const reorderController = require('../shared/studio-editor-slide-reorder-controller.js');

test('slide reorder controller assembles canonical and persistence dependencies', () => {
  const calls = [];
  const liveCanonicalDeck = { id: 'live-baseline' };
  const pendingCanonicalDeck = { id: 'pending-baseline' };
  const legacyCanonicalDeck = { slides: [] };
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
    transactionApi: {
      createStudioSlideOrderTransaction() {
        return { type: 'slide-order' };
      }
    },
    getCanonicalDeckBaseline: () => liveCanonicalDeck,
    getPendingCanonicalDeck: () => pendingCanonicalDeck,
    getIframeDoc: () => ({ id: 'doc' }),
    getSlides: () => [{ id: 'slide-1' }],
    getSlideId: (slide) => slide.id,
    buildCanonicalDeck: () => legacyCanonicalDeck,
    buildCanonicalDeckBaseline: () => ({ id: 'baseline-fallback' }),
    captureSlideMutationState: () => ({ id: 'restore' }),
    applyReorder: () => ({ didApply: true }),
    generateThumbnails: () => calls.push(['thumbnails']),
    restoreDeckViewAfterSlideMutation: () => calls.push(['restore']),
    rollbackMutation: () => calls.push(['rollback']),
    finalizeMutation: () => calls.push(['finalize'])
  });

  assert.equal(controller.reorder(0, 1), true);
  assert.equal(calls[0][0], 'createBuilders');
  assert.equal(calls[0][1].canonicalDeckApi.id, 'canonical-api');
  assert.equal(calls[0][1].buildCanonicalDeck({}), legacyCanonicalDeck);
  assert.equal(calls[0][1].buildCanonicalDeckBaseline({}).id, 'baseline-fallback');
  assert.equal(calls[0][1].getCanonicalDeckBaseline(), liveCanonicalDeck);
  assert.equal(calls[0][1].getPendingCanonicalDeck(), pendingCanonicalDeck);
  assert.equal(calls[1][0], 'reorder');
  assert.equal(calls[1][1], 0);
  assert.equal(calls[1][2], 1);
  assert.equal(calls[1][3].getIframeDoc().id, 'doc');
  assert.equal(calls[1][3].getSlides()[0].id, 'slide-1');
  assert.equal(calls[1][3].getSlideId({ id: 'slide-2' }), 'slide-2');
  assert.equal(typeof calls[1][3].createStudioSlideOrderTransaction, 'function');
  assert.equal(calls[1][3].captureSlideMutationState().id, 'restore');
  assert.deepEqual(
    calls[1][3].buildCanonicalReorderSlideBaseline(),
    canonicalBuilders.buildCanonicalReorderSlideBaseline()
  );
  assert.equal(typeof calls[1][3].rollbackMutation, 'function');
});

test('slide reorder controller fails closed without a reorder command', () => {
  const controller = reorderController.createStudioEditorSlideReorderController({
    slideCommandsApi: null
  });

  assert.equal(controller.reorder(0, 1), false);
});

test('slide reorder controller owns the shared transaction adapter when available', () => {
  const container = { id: 'container' };
  const slideNode = { id: 'slide-1' };
  const beforeNode = { id: 'slide-2' };
  const mutationApi = { name: 'mutation' };
  const deckViewApi = { name: 'deck-view' };
  const transactionApi = { name: 'transaction' };
  const delegated = [];
  let legacyCalled = false;
  const slideCommandsApi = {
    applyStudioSlideReorderWithTransaction() {},
    reorderStudioSlideNodes(fromIdx, toIdx, options) {
      assert.equal(fromIdx, 0);
      assert.equal(toIdx, 1);
      return options.applyReorder(container, slideNode, beforeNode, {
        skipMarkupTransactionCapture: true
      }).didApply;
    }
  };
  const controller = reorderController.createStudioEditorSlideReorderController({
    slideCommandsApi,
    reorderTransactionApi: {
      applyStudioEditorSlideReorderMutationWithTransaction(...args) {
        delegated.push(args);
        return { didApply: true, transaction: { id: 'tx-reorder' } };
      }
    },
    reorderMutationApi: mutationApi,
    deckViewApi,
    transactionApi,
    applyReorder() {
      legacyCalled = true;
      return { didApply: false, transaction: null };
    }
  });

  assert.equal(controller.reorder(0, 1), true);
  assert.equal(legacyCalled, false);
  assert.equal(delegated.length, 1);
  assert.equal(delegated[0][0], container);
  assert.equal(delegated[0][1], slideNode);
  assert.equal(delegated[0][2], beforeNode);
  assert.deepEqual(delegated[0][3], {
    mutationApi,
    slideCommandsApi,
    deckViewApi,
    transactionApi,
    skipMarkupTransactionCapture: true
  });
  assert.equal(typeof delegated[0][3].slideCommandsApi.applyStudioSlideReorderWithTransaction, 'function');
});

test('slide reorder controller uses the shared applicator factory when available', () => {
  const calls = [];
  const controller = reorderController.createStudioEditorSlideReorderController({
    slideCommandsApi: {
      reorderStudioSlideNodes(fromIdx, toIdx, options) {
        calls.push(['reorder', fromIdx, toIdx]);
        return options.applyReorder('container', 'slide', 'before').didApply;
      }
    },
    reorderTransactionApi: {
      createStudioEditorSlideReorderApplicator(options) {
        calls.push(['factory', options]);
        return (...args) => {
          calls.push(['applicator', ...args]);
          return { didApply: true, transaction: null };
        };
      }
    },
    reorderMutationApi: { id: 'mutation' },
    deckViewApi: { id: 'view' },
    transactionApi: { id: 'transaction' }
  });

  assert.equal(controller.reorder(0, 1), true);
  assert.equal(calls[0][0], 'factory');
  assert.equal(calls[0][1].mutationApi.id, 'mutation');
  assert.equal(calls[0][1].deckViewApi.id, 'view');
  assert.equal(calls[0][1].transactionApi.id, 'transaction');
  assert.equal(calls[1][0], 'reorder');
  assert.deepEqual(calls[2], ['applicator', 'container', 'slide', 'before']);
});

test('slide reorder controller fails closed when canonical builder construction throws', () => {
  let reorderCalls = 0;
  const controller = reorderController.createStudioEditorSlideReorderController({
    slideCommandsApi: {
      reorderStudioSlideNodes() {
        reorderCalls += 1;
        return true;
      }
    },
    canonicalSlideApi: {
      createStudioCanonicalReorderSlideMutationBuilders() {
        throw new Error('canonical builder unavailable');
      }
    }
  });

  assert.equal(controller.reorder(0, 1), false);
  assert.equal(reorderCalls, 0);
});
