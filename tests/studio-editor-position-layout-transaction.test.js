const test = require('node:test');
const assert = require('node:assert/strict');

const positionLayoutTransaction = require('../shared/studio-editor-position-layout-transaction.js');

test('applyStudioEditorPositionLayoutMutationWithTransaction composes layout dependencies', () => {
  const nextItems = [{ element: { dataset: { editorId: 'node-1' } }, left: 10 }];
  const applyLayout = () => {};
  let delegated = null;

  const result = positionLayoutTransaction.applyStudioEditorPositionLayoutMutationWithTransaction(
    nextItems,
    {
      mutationApi: {
        applyStudioPositionLayoutMutationWithTransaction(items, options) {
          delegated = { items, options };
          return { didApply: true, transaction: { id: 'tx-position' } };
        }
      },
      transactionApi: { createStudioPositionTransaction() {} },
      alignmentApi: { applyStudioAlignmentLayout() {} },
      applyLayout,
      getElementId: (element) => element.dataset.editorId
    }
  );

  assert.deepEqual(result, { didApply: true, transaction: { id: 'tx-position' } });
  assert.equal(delegated.items, nextItems);
  assert.equal(typeof delegated.options.transactionApi.createStudioPositionTransaction, 'function');
  assert.equal(typeof delegated.options.alignmentApi.applyStudioAlignmentLayout, 'function');
  assert.equal(delegated.options.applyLayout, applyLayout);
  assert.equal(delegated.options.getElementId(nextItems[0].element), 'node-1');
});

test('applyStudioEditorPositionLayoutMutationWithTransaction leaves omitted layout overrides absent', () => {
  let delegatedOptions = null;
  positionLayoutTransaction.applyStudioEditorPositionLayoutMutationWithTransaction([], {
    mutationApi: {
      applyStudioPositionLayoutMutationWithTransaction(_items, options) {
        delegatedOptions = options;
        return { didApply: true, transaction: null };
      }
    }
  });

  assert.equal(Object.prototype.hasOwnProperty.call(delegatedOptions, 'applyLayout'), false);
});

test('applyStudioEditorPositionLayoutMutationWithTransaction fails closed without the mutation adapter', () => {
  assert.deepEqual(
    positionLayoutTransaction.applyStudioEditorPositionLayoutMutationWithTransaction([], {}),
    { didApply: false, transaction: null }
  );
});

test('position layout applicator centralizes transaction dependencies and preserves fallback callbacks', () => {
  let delegated = null;
  const applicator = positionLayoutTransaction.createStudioEditorPositionLayoutApplicator({
    mutationApi: {
      applyStudioPositionLayoutMutationWithTransaction(items, options) {
        delegated = { items, options };
        return { didApply: true, transaction: { id: 'tx-position' } };
      }
    },
    transactionApi: { id: 'transaction' },
    alignmentApi: { id: 'alignment' }
  });

  const items = [{ element: { id: 'node-1' }, nextLeft: 12 }];
  assert.deepEqual(
    applicator(items, { getElementId: () => 'node-1' }),
    { didApply: true, transaction: { id: 'tx-position' } }
  );
  assert.equal(delegated.items, items);
  assert.equal(delegated.options.transactionApi.id, 'transaction');
  assert.equal(delegated.options.alignmentApi.id, 'alignment');
  assert.equal(typeof delegated.options.getElementId, 'function');

  const legacyApplicator = positionLayoutTransaction.createStudioEditorPositionLayoutApplicator({
    legacyApplyPositionLayout: () => ({ didApply: true, transaction: { id: 'legacy-position' } })
  });
  assert.deepEqual(
    legacyApplicator(items),
    { didApply: true, transaction: { id: 'legacy-position' } }
  );
});
