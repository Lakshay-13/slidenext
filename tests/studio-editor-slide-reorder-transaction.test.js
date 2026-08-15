const test = require('node:test');
const assert = require('node:assert/strict');

const slideReorderTransaction = require('../shared/studio-editor-slide-reorder-transaction.js');

test('applyStudioEditorSlideReorderMutationWithTransaction composes reorder dependencies', () => {
  const container = { id: 'slides-container' };
  const slideNode = { id: 'slide-1' };
  const beforeNode = { id: 'slide-2' };
  let delegated = null;

  const result = slideReorderTransaction.applyStudioEditorSlideReorderMutationWithTransaction(
    container,
    slideNode,
    beforeNode,
    {
      mutationApi: {
        applyStudioSlideReorderMutationWithTransaction(currentContainer, currentSlide, currentBefore, options) {
          delegated = { currentContainer, currentSlide, currentBefore, options };
          return { didApply: true, transaction: { id: 'tx-reorder' } };
        }
      },
      slideCommandsApi: { applyStudioSlideReorderWithTransaction() {} },
      deckViewApi: { applyStudioSlideReorderMutation() {} },
      transactionApi: { createStudioMarkupTransactionCapture() {} },
      containerElementId: 'container-1',
      skipMarkupTransactionCapture: true,
      getElementId: () => 'slide-1'
    }
  );

  assert.deepEqual(result, { didApply: true, transaction: { id: 'tx-reorder' } });
  assert.equal(delegated.currentContainer, container);
  assert.equal(delegated.currentSlide, slideNode);
  assert.equal(delegated.currentBefore, beforeNode);
  assert.equal(typeof delegated.options.slideCommandsApi.applyStudioSlideReorderWithTransaction, 'function');
  assert.equal(typeof delegated.options.deckViewApi.applyStudioSlideReorderMutation, 'function');
  assert.equal(typeof delegated.options.transactionApi.createStudioMarkupTransactionCapture, 'function');
  assert.equal(delegated.options.containerElementId, 'container-1');
  assert.equal(delegated.options.skipMarkupTransactionCapture, true);
  assert.equal(delegated.options.getElementId(), 'slide-1');
});

test('applyStudioEditorSlideReorderMutationWithTransaction fails closed without the mutation adapter', () => {
  assert.deepEqual(
    slideReorderTransaction.applyStudioEditorSlideReorderMutationWithTransaction({}, {}, null, {}),
    { didApply: false, transaction: null }
  );
});

test('createStudioEditorSlideReorderApplicator prefers shared mutation and preserves legacy fallback', () => {
  const calls = [];
  const mutationApi = {
    applyStudioSlideReorderMutationWithTransaction(container, slideNode, beforeNode, options) {
      calls.push(['shared', container, slideNode, beforeNode, options]);
      return { didApply: true, transaction: { id: 'shared-reorder' } };
    }
  };
  const applicator = slideReorderTransaction.createStudioEditorSlideReorderApplicator({
    mutationApi,
    slideCommandsApi: { id: 'slide-commands' },
    deckViewApi: { id: 'deck-view' },
    transactionApi: { id: 'transaction' },
    legacyApplyReorder() {
      calls.push(['legacy']);
      return { didApply: false, transaction: null };
    }
  });

  assert.deepEqual(
    applicator('container', 'slide', 'before', { skipMarkupTransactionCapture: true }),
    { didApply: true, transaction: { id: 'shared-reorder' } }
  );
  assert.equal(calls[0][0], 'shared');
  assert.equal(calls[0][4].slideCommandsApi.id, 'slide-commands');
  assert.equal(calls[0][4].deckViewApi.id, 'deck-view');
  assert.equal(calls[0][4].transactionApi.id, 'transaction');
  assert.equal(calls[0][4].skipMarkupTransactionCapture, true);

  const fallback = slideReorderTransaction.createStudioEditorSlideReorderApplicator({
    legacyApplyReorder(...args) {
      calls.push(['fallback', ...args]);
      return { didApply: true, transaction: null };
    }
  });
  assert.deepEqual(
    fallback('container', 'slide', 'before', { legacy: true }),
    { didApply: true, transaction: null }
  );
  assert.deepEqual(calls[1], ['fallback', 'container', 'slide', 'before', { legacy: true }]);
});
