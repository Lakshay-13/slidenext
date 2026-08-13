const test = require('node:test');
const assert = require('node:assert/strict');

const slideReorderMutation = require('../shared/studio-editor-slide-reorder-mutation.js');
const studioTransaction = require('../shared/studio-editor-transaction.js');

test('applyStudioSlideReorderMutationWithTransaction delegates reorder and markup transaction dependencies', () => {
  const container = { id: 'slides-container' };
  const slideNode = { id: 'slide-1' };
  const beforeNode = { id: 'slide-2' };
  let delegated = null;

  const result = slideReorderMutation.applyStudioSlideReorderMutationWithTransaction(
    container,
    slideNode,
    beforeNode,
    {
      slideCommandsApi: {
        applyStudioSlideReorderWithTransaction(currentContainer, currentSlide, currentBefore, options) {
          delegated = { currentContainer, currentSlide, currentBefore, options };
          return { didApply: true, transaction: { id: 'tx-reorder' } };
        }
      },
      deckViewApi: {
        applyStudioSlideReorderMutation() {}
      },
      transactionApi: {
        createStudioMarkupTransactionCapture: studioTransaction.createStudioMarkupTransactionCapture
      },
      containerElementId: 'container-1',
      skipMarkupTransactionCapture: true,
      getElementId: () => 'slide-1'
    }
  );

  assert.deepEqual(result, { didApply: true, transaction: { id: 'tx-reorder' } });
  assert.equal(delegated.currentContainer, container);
  assert.equal(delegated.currentSlide, slideNode);
  assert.equal(delegated.currentBefore, beforeNode);
  assert.equal(typeof delegated.options.applyStudioSlideReorderMutation, 'function');
  assert.equal(typeof delegated.options.createStudioMarkupTransactionCapture, 'function');
  assert.equal(delegated.options.containerElementId, 'container-1');
  assert.equal(delegated.options.skipMarkupTransactionCapture, true);
});

test('applyStudioSlideReorderMutationWithTransaction fails closed without a shared slide-command adapter', () => {
  assert.deepEqual(
    slideReorderMutation.applyStudioSlideReorderMutationWithTransaction({}, {}, null, {}),
    { didApply: false, transaction: null }
  );
});
