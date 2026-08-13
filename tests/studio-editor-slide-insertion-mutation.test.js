const test = require('node:test');
const assert = require('node:assert/strict');

const slideInsertionMutation = require('../shared/studio-editor-slide-insertion-mutation.js');
const studioTransaction = require('../shared/studio-editor-transaction.js');

test('applyStudioSlideInsertionMutationWithTransaction delegates insertion and markup transaction dependencies', () => {
  const container = { id: 'slides-container' };
  const slideNode = { id: 'slide-1' };
  let delegated = null;

  const result = slideInsertionMutation.applyStudioSlideInsertionMutationWithTransaction(
    container,
    slideNode,
    {
      slideCommandsApi: {
        applyStudioSlideInsertionWithTransaction(currentContainer, currentSlide, options) {
          delegated = { currentContainer, currentSlide, options };
          return { didApply: true, transaction: { id: 'tx-insert' } };
        }
      },
      deckViewApi: {
        applyStudioSlideInsertionMutation() {}
      },
      transactionApi: {
        createStudioMarkupTransactionCapture: studioTransaction.createStudioMarkupTransactionCapture
      },
      containerElementId: 'container-1',
      beforeNode: { id: 'slide-2' },
      skipMarkupTransactionCapture: true,
      getElementId: () => 'slide-1'
    }
  );

  assert.deepEqual(result, { didApply: true, transaction: { id: 'tx-insert' } });
  assert.equal(delegated.currentContainer, container);
  assert.equal(delegated.currentSlide, slideNode);
  assert.equal(typeof delegated.options.applyStudioSlideInsertionMutation, 'function');
  assert.equal(typeof delegated.options.createStudioMarkupTransactionCapture, 'function');
  assert.equal(delegated.options.containerElementId, 'container-1');
  assert.equal(delegated.options.skipMarkupTransactionCapture, true);
});

test('applyStudioSlideInsertionMutationWithTransaction fails closed without a shared slide-command adapter', () => {
  assert.deepEqual(
    slideInsertionMutation.applyStudioSlideInsertionMutationWithTransaction({}, {}, {}),
    { didApply: false, transaction: null }
  );
});
