const test = require('node:test');
const assert = require('node:assert/strict');

const lockTransaction = require('../shared/studio-editor-lock-transaction.js');

test('lock applicator centralizes transaction dependencies and preserves fallback callbacks', () => {
  let delegated = null;
  const applicator = lockTransaction.createStudioEditorLockApplicator({
    mutationApi: {
      applyStudioLockMutationWithTransaction(selection, shouldLock, options) {
        delegated = { selection, shouldLock, options };
        return { didApply: true, transaction: { id: 'tx-lock' } };
      }
    },
    lockApi: { id: 'lock' },
    transactionApi: { id: 'transaction' }
  });

  const selection = [{ id: 'node-1' }];
  assert.deepEqual(
    applicator(selection, true, { getElementId: () => 'node-1' }),
    { didApply: true, transaction: { id: 'tx-lock' } }
  );
  assert.equal(delegated.selection, selection);
  assert.equal(delegated.shouldLock, true);
  assert.equal(delegated.options.lockApi.id, 'lock');
  assert.equal(delegated.options.transactionApi.id, 'transaction');
  assert.equal(typeof delegated.options.getElementId, 'function');

  const legacyApplicator = lockTransaction.createStudioEditorLockApplicator({
    legacyApplyLock: () => ({ didApply: true, transaction: { id: 'legacy-lock' } })
  });
  assert.deepEqual(
    legacyApplicator(selection, false),
    { didApply: true, transaction: { id: 'legacy-lock' } }
  );
});
