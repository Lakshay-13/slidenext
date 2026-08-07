const test = require('node:test');
const assert = require('node:assert/strict');

const positionLayoutMutation = require('../shared/studio-editor-position-layout-mutation.js');

test('applyStudioPositionLayoutMutationWithTransaction delegates transaction and alignment dependencies', () => {
  const items = [{ element: { dataset: { editorId: 'node-1' } }, nextLeft: 12, nextTop: 18 }];
  let delegated = null;

  const result = positionLayoutMutation.applyStudioPositionLayoutMutationWithTransaction(items, {
    transactionApi: {
      applyStudioPositionLayoutWithTransaction(currentItems, options) {
        delegated = { currentItems, options };
        return { didApply: true, transaction: { id: 'tx-position' } };
      },
      createStudioPositionTransaction() {
        return { id: 'position-transaction' };
      }
    },
    alignmentApi: {
      applyStudioAlignmentLayout() {}
    },
    getElementId: (element) => element.dataset.editorId
  });

  assert.deepEqual(result, { didApply: true, transaction: { id: 'tx-position' } });
  assert.equal(delegated.currentItems, items);
  assert.equal(typeof delegated.options.createPositionTransaction, 'function');
  assert.equal(typeof delegated.options.applyLayout, 'function');
  assert.equal(typeof delegated.options.getElementId, 'function');
});

test('applyStudioPositionLayoutMutationWithTransaction preserves an explicit layout override', () => {
  const override = () => ({ didApply: true, transaction: { id: 'override' } });
  let captured = null;
  const result = positionLayoutMutation.applyStudioPositionLayoutMutationWithTransaction([], {
    transactionApi: {
      applyStudioPositionLayoutWithTransaction(_items, options) {
        captured = options.applyLayout;
        return options.applyLayout();
      }
    },
    alignmentApi: {
      applyStudioAlignmentLayout() {
        throw new Error('default layout should not replace explicit override');
      }
    },
    applyLayout: override
  });

  assert.deepEqual(result, { didApply: true, transaction: { id: 'override' } });
  assert.equal(captured, override);
});

test('applyStudioPositionLayoutMutationWithTransaction fails closed without a transaction adapter', () => {
  assert.deepEqual(
    positionLayoutMutation.applyStudioPositionLayoutMutationWithTransaction([], {}),
    { didApply: false, transaction: null }
  );
});
