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
