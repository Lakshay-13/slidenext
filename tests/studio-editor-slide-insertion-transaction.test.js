const test = require('node:test');
const assert = require('node:assert/strict');

const slideInsertionTransaction = require('../shared/studio-editor-slide-insertion-transaction.js');

test('applyStudioEditorSlideInsertionMutationWithTransaction composes insertion dependencies', () => {
  const container = { id: 'slides-container' };
  const slideNode = { id: 'slide-1' };
  const beforeNode = { id: 'slide-2' };
  let delegated = null;

  const result = slideInsertionTransaction.applyStudioEditorSlideInsertionMutationWithTransaction(
    container,
    slideNode,
    {
      mutationApi: {
        applyStudioSlideInsertionMutationWithTransaction(currentContainer, currentSlide, options) {
          delegated = { currentContainer, currentSlide, options };
          return { didApply: true, transaction: { id: 'tx-insertion' } };
        }
      },
      slideCommandsApi: { applyStudioSlideInsertionWithTransaction() {} },
      deckViewApi: { applyStudioSlideInsertionMutation() {} },
      transactionApi: { createStudioMarkupTransactionCapture() {} },
      containerElementId: 'container-1',
      beforeNode,
      skipMarkupTransactionCapture: true,
      getElementId: () => 'slide-1'
    }
  );

  assert.deepEqual(result, { didApply: true, transaction: { id: 'tx-insertion' } });
  assert.equal(delegated.currentContainer, container);
  assert.equal(delegated.currentSlide, slideNode);
  assert.equal(delegated.options.beforeNode, beforeNode);
  assert.equal(typeof delegated.options.slideCommandsApi.applyStudioSlideInsertionWithTransaction, 'function');
  assert.equal(typeof delegated.options.deckViewApi.applyStudioSlideInsertionMutation, 'function');
  assert.equal(typeof delegated.options.transactionApi.createStudioMarkupTransactionCapture, 'function');
  assert.equal(delegated.options.containerElementId, 'container-1');
  assert.equal(delegated.options.skipMarkupTransactionCapture, true);
  assert.equal(delegated.options.getElementId(), 'slide-1');
});

test('applyStudioEditorSlideInsertionMutationWithTransaction fails closed without the mutation adapter', () => {
  assert.deepEqual(
    slideInsertionTransaction.applyStudioEditorSlideInsertionMutationWithTransaction({}, {}, {}),
    { didApply: false, transaction: null }
  );
});
