const test = require('node:test');
const assert = require('node:assert/strict');

const slideDeletionTransaction = require('../shared/studio-editor-slide-deletion-transaction.js');

test('applyStudioEditorSlideDeletionMutationWithTransaction composes deletion dependencies', () => {
  const container = { id: 'slides-container' };
  const slideNode = { id: 'slide-1' };
  let delegated = null;

  const result = slideDeletionTransaction.applyStudioEditorSlideDeletionMutationWithTransaction(
    container,
    slideNode,
    {
      mutationApi: {
        applyStudioSlideDeletionMutationWithTransaction(currentContainer, currentSlide, options) {
          delegated = { currentContainer, currentSlide, options };
          return { didApply: true, transaction: { id: 'tx-deletion' } };
        }
      },
      slideCommandsApi: { applyStudioSlideDeletionWithTransaction() {} },
      deckViewApi: { applyStudioSlideDeletionMutation() {} },
      transactionApi: { createStudioMarkupTransactionCapture() {} },
      containerElementId: 'container-1',
      skipMarkupTransactionCapture: true,
      getElementId: () => 'slide-1'
    }
  );

  assert.deepEqual(result, { didApply: true, transaction: { id: 'tx-deletion' } });
  assert.equal(delegated.currentContainer, container);
  assert.equal(delegated.currentSlide, slideNode);
  assert.equal(typeof delegated.options.slideCommandsApi.applyStudioSlideDeletionWithTransaction, 'function');
  assert.equal(typeof delegated.options.deckViewApi.applyStudioSlideDeletionMutation, 'function');
  assert.equal(typeof delegated.options.transactionApi.createStudioMarkupTransactionCapture, 'function');
  assert.equal(delegated.options.containerElementId, 'container-1');
  assert.equal(delegated.options.skipMarkupTransactionCapture, true);
  assert.equal(delegated.options.getElementId(), 'slide-1');
});

test('applyStudioEditorSlideDeletionMutationWithTransaction fails closed without the mutation adapter', () => {
  assert.deepEqual(
    slideDeletionTransaction.applyStudioEditorSlideDeletionMutationWithTransaction({}, {}, {}),
    { didApply: false, transaction: null }
  );
});

test('createStudioEditorSlideDeletionApplicator prefers shared mutation and preserves legacy fallback', () => {
  const calls = [];
  const mutationApi = {
    applyStudioSlideDeletionMutationWithTransaction(container, slideNode, options) {
      calls.push(['shared', container, slideNode, options]);
      return { didApply: true, transaction: { id: 'shared-deletion' } };
    }
  };
  const applicator = slideDeletionTransaction.createStudioEditorSlideDeletionApplicator({
    mutationApi,
    slideCommandsApi: { id: 'slide-commands' },
    deckViewApi: { id: 'deck-view' },
    transactionApi: { id: 'transaction' },
    legacyApplyDeletion() {
      calls.push(['legacy']);
      return { didApply: false, transaction: null };
    }
  });

  assert.deepEqual(
    applicator('container', 'slide', { skipMarkupTransactionCapture: true }),
    { didApply: true, transaction: { id: 'shared-deletion' } }
  );
  assert.equal(calls[0][0], 'shared');
  assert.equal(calls[0][3].slideCommandsApi.id, 'slide-commands');
  assert.equal(calls[0][3].deckViewApi.id, 'deck-view');
  assert.equal(calls[0][3].transactionApi.id, 'transaction');
  assert.equal(calls[0][3].skipMarkupTransactionCapture, true);

  const fallback = slideDeletionTransaction.createStudioEditorSlideDeletionApplicator({
    legacyApplyDeletion(...args) {
      calls.push(['fallback', ...args]);
      return { didApply: true, transaction: null };
    }
  });
  assert.deepEqual(
    fallback('container', 'slide', { legacy: true }),
    { didApply: true, transaction: null }
  );
  assert.deepEqual(calls[1], ['fallback', 'container', 'slide', { legacy: true }]);
});
