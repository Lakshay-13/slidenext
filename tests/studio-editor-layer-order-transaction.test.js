const test = require('node:test');
const assert = require('node:assert/strict');

const layerOrderTransaction = require('../shared/studio-editor-layer-order-transaction.js');

test('applyStudioEditorLayerOrderMutationWithTransaction composes layer-order dependencies', () => {
  const slide = { id: 'slide-1' };
  const initialOrder = [{ dataset: { editorId: 'node-1' } }];
  const nextOrder = [{ dataset: { editorId: 'node-2' } }];
  const applyLayerOrder = () => {};
  let delegated = null;

  const result = layerOrderTransaction.applyStudioEditorLayerOrderMutationWithTransaction(
    slide,
    initialOrder,
    nextOrder,
    {
      mutationApi: {
        applyStudioLayerOrderMutationWithTransaction(currentSlide, currentInitialOrder, currentNextOrder, options) {
          delegated = { currentSlide, currentInitialOrder, currentNextOrder, options };
          return { didApply: true, transaction: { id: 'tx-layer' } };
        }
      },
      layerOrderApi: {
        applyStudioLayerOrderMutation() {}
      },
      transactionApi: {
        createStudioStyleTransaction() {}
      },
      applyLayerOrder,
      getElementId: (element) => element.dataset.editorId
    }
  );

  assert.deepEqual(result, { didApply: true, transaction: { id: 'tx-layer' } });
  assert.equal(delegated.currentSlide, slide);
  assert.equal(delegated.currentInitialOrder, initialOrder);
  assert.equal(delegated.currentNextOrder, nextOrder);
  assert.equal(typeof delegated.options.layerOrderApi.applyStudioLayerOrderMutation, 'function');
  assert.equal(typeof delegated.options.transactionApi.createStudioStyleTransaction, 'function');
  assert.equal(delegated.options.applyLayerOrder, applyLayerOrder);
  assert.equal(delegated.options.getElementId(initialOrder[0]), 'node-1');
});

test('applyStudioEditorLayerOrderMutationWithTransaction fails closed without the mutation adapter', () => {
  assert.deepEqual(
    layerOrderTransaction.applyStudioEditorLayerOrderMutationWithTransaction({}, [], [], {}),
    { didApply: false, transaction: null }
  );
});

test('layer-order applicator centralizes transaction dependencies and preserves fallback callbacks', () => {
  let delegated = null;
  const slide = { id: 'slide-1' };
  const initialOrder = [{ id: 'node-1' }];
  const nextOrder = [{ id: 'node-2' }];
  const applyLayerOrder = () => {};
  const applicator = layerOrderTransaction.createStudioEditorLayerOrderApplicator({
    mutationApi: {
      applyStudioLayerOrderMutationWithTransaction(currentSlide, currentInitialOrder, currentNextOrder, options) {
        delegated = { currentSlide, currentInitialOrder, currentNextOrder, options };
        return { didApply: true, transaction: { id: 'shared-layer-order' } };
      }
    },
    layerOrderApi: { id: 'layer-order' },
    transactionApi: { id: 'transaction' },
    applyLayerOrder
  });

  assert.deepEqual(
    applicator(slide, initialOrder, nextOrder, { getElementId: () => 'node-2' }),
    { didApply: true, transaction: { id: 'shared-layer-order' } }
  );
  assert.equal(delegated.currentSlide, slide);
  assert.equal(delegated.options.layerOrderApi.id, 'layer-order');
  assert.equal(delegated.options.transactionApi.id, 'transaction');
  assert.equal(delegated.options.applyLayerOrder, applyLayerOrder);

  const legacyApplicator = layerOrderTransaction.createStudioEditorLayerOrderApplicator({
    legacyApplyLayerOrder: () => ({ didApply: true, transaction: { id: 'legacy-layer-order' } })
  });
  assert.deepEqual(
    legacyApplicator(slide, initialOrder, nextOrder),
    { didApply: true, transaction: { id: 'legacy-layer-order' } }
  );
});
