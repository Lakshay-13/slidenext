const test = require('node:test');
const assert = require('node:assert/strict');

const studioTransaction = require('../shared/studio-editor-transaction.js');
const visibilityState = require('../shared/studio-editor-visibility-state.js');
const visibilityMutation = require('../shared/studio-editor-visibility-mutation.js');

test('applyStudioVisibilityMutationWithTransaction delegates visibility and transaction dependencies', () => {
  const selection = [{ dataset: { editorId: 'node-1' } }];
  let delegated = null;

  const result = visibilityMutation.applyStudioVisibilityMutationWithTransaction(
    selection,
    true,
    {
      visibilityApi: {
        applyStudioVisibilityMutation: visibilityState.applyStudioVisibilityMutation,
        applyStudioVisibilityWithTransaction(currentSelection, shouldHide, options) {
          delegated = { currentSelection, shouldHide, options };
          return { didApply: true, transaction: { id: 'tx-visibility' } };
        }
      },
      transactionApi: {
        createStudioVisibilityTransaction: studioTransaction.createStudioVisibilityTransaction
      },
      isHidden: () => false,
      setHidden() {},
      getVisibilityState: () => ({ hidden: false }),
      getElementId: (element) => element.dataset.editorId
    }
  );

  assert.deepEqual(result, { didApply: true, transaction: { id: 'tx-visibility' } });
  assert.equal(delegated.currentSelection, selection);
  assert.equal(delegated.shouldHide, true);
  assert.equal(typeof delegated.options.applyStudioVisibilityMutation, 'function');
  assert.equal(typeof delegated.options.createStudioVisibilityTransaction, 'function');
});

test('applyStudioVisibilityMutationWithTransaction fails closed without a shared visibility adapter', () => {
  assert.deepEqual(
    visibilityMutation.applyStudioVisibilityMutationWithTransaction([], true, {}),
    { didApply: false, transaction: null }
  );
});
