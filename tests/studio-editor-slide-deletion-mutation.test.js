const test = require('node:test');
const assert = require('node:assert/strict');

const slideDeletionMutation = require('../shared/studio-editor-slide-deletion-mutation.js');
const studioTransaction = require('../shared/studio-editor-transaction.js');

test('applyStudioSlideDeletionMutationWithTransaction delegates deletion and markup transaction dependencies', () => {
  const container = { id: 'slides-container' };
  const slideNode = { id: 'slide-1' };
  let delegated = null;

  const result = slideDeletionMutation.applyStudioSlideDeletionMutationWithTransaction(
    container,
    slideNode,
    {
      slideCommandsApi: {
        applyStudioSlideDeletionWithTransaction(currentContainer, currentSlide, options) {
          delegated = { currentContainer, currentSlide, options };
          return { didApply: true, transaction: { id: 'tx-delete' } };
        }
      },
      deckViewApi: {
        applyStudioSlideDeletionMutation() {}
      },
      transactionApi: {
        createStudioMarkupTransactionCapture: studioTransaction.createStudioMarkupTransactionCapture
      },
      containerElementId: 'container-1',
      skipMarkupTransactionCapture: true,
      getElementId: () => 'slide-1'
    }
  );

  assert.deepEqual(result, { didApply: true, transaction: { id: 'tx-delete' } });
  assert.equal(delegated.currentContainer, container);
  assert.equal(delegated.currentSlide, slideNode);
  assert.equal(typeof delegated.options.applyStudioSlideDeletionMutation, 'function');
  assert.equal(typeof delegated.options.createStudioMarkupTransactionCapture, 'function');
  assert.equal(delegated.options.containerElementId, 'container-1');
  assert.equal(delegated.options.skipMarkupTransactionCapture, true);
});

test('applyStudioSlideDeletionMutationWithTransaction fails closed without a shared slide-command adapter', () => {
  assert.deepEqual(
    slideDeletionMutation.applyStudioSlideDeletionMutationWithTransaction({}, {}, {}),
    { didApply: false, transaction: null }
  );
});
