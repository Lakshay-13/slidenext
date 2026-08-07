const test = require('node:test');
const assert = require('node:assert/strict');

const layerOrder = require('../shared/studio-editor-layer-order.js');
const layerOrderMutation = require('../shared/studio-editor-layer-order-mutation.js');
const studioTransaction = require('../shared/studio-editor-transaction.js');

test('applyStudioLayerOrderMutationWithTransaction delegates layer ordering and transaction dependencies', () => {
  const slide = { id: 'slide-1' };
  const initialOrder = [{ dataset: { editorId: 'node-1' } }];
  const nextOrder = [{ dataset: { editorId: 'node-2' } }];
  let delegated = null;

  const result = layerOrderMutation.applyStudioLayerOrderMutationWithTransaction(
    slide,
    initialOrder,
    nextOrder,
    {
      layerOrderApi: {
        applyStudioLayerOrderMutation: layerOrder.applyStudioLayerOrderMutation,
        applyStudioLayerOrderWithTransaction(currentSlide, currentInitialOrder, currentNextOrder, options) {
          delegated = { currentSlide, currentInitialOrder, currentNextOrder, options };
          return { didApply: true, transaction: { id: 'tx-layer' } };
        }
      },
      transactionApi: {
        createStudioStyleTransaction: studioTransaction.createStudioStyleTransaction
      },
      applyLayerOrder() {},
      getElementId: (element) => element.dataset.editorId
    }
  );

  assert.deepEqual(result, { didApply: true, transaction: { id: 'tx-layer' } });
  assert.equal(delegated.currentSlide, slide);
  assert.equal(delegated.currentInitialOrder, initialOrder);
  assert.equal(delegated.currentNextOrder, nextOrder);
  assert.equal(typeof delegated.options.applyStudioLayerOrderMutation, 'function');
  assert.equal(typeof delegated.options.createStudioStyleTransaction, 'function');
});

test('applyStudioLayerOrderMutationWithTransaction fails closed without a shared layer-order adapter', () => {
  assert.deepEqual(
    layerOrderMutation.applyStudioLayerOrderMutationWithTransaction({}, [], [], {}),
    { didApply: false, transaction: null }
  );
});
