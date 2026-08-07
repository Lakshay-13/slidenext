const test = require('node:test');
const assert = require('node:assert/strict');

const lockMutation = require('../shared/studio-editor-lock-mutation.js');
const lockState = require('../shared/studio-editor-lock-state.js');
const studioTransaction = require('../shared/studio-editor-transaction.js');

test('applyStudioLockMutationWithTransaction delegates lock and dataset transaction dependencies', () => {
  const selection = [{ dataset: { editorId: 'node-1' } }];
  let delegated = null;

  const result = lockMutation.applyStudioLockMutationWithTransaction(
    selection,
    true,
    {
      lockApi: {
        applyStudioLockMutation: lockState.applyStudioLockMutation,
        applyStudioLockWithTransaction(currentSelection, shouldLock, options) {
          delegated = { currentSelection, shouldLock, options };
          return { didApply: true, transaction: { id: 'tx-lock' } };
        }
      },
      transactionApi: {
        createStudioDatasetTransaction: studioTransaction.createStudioDatasetTransaction
      },
      isLocked: () => false,
      setLocked() {},
      getElementId: (element) => element.dataset.editorId
    }
  );

  assert.deepEqual(result, { didApply: true, transaction: { id: 'tx-lock' } });
  assert.equal(delegated.currentSelection, selection);
  assert.equal(delegated.shouldLock, true);
  assert.equal(typeof delegated.options.applyStudioLockMutation, 'function');
  assert.equal(typeof delegated.options.createStudioDatasetTransaction, 'function');
});

test('applyStudioLockMutationWithTransaction fails closed without a shared lock adapter', () => {
  assert.deepEqual(
    lockMutation.applyStudioLockMutationWithTransaction([], true, {}),
    { didApply: false, transaction: null }
  );
});
