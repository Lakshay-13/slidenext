const test = require('node:test');
const assert = require('node:assert/strict');

const ungroupTransaction = require('../shared/studio-editor-ungroup-transaction.js');

test('ungroup applicator centralizes transaction dependencies and preserves fallback callbacks', () => {
  let delegated = null;
  const applicator = ungroupTransaction.createStudioEditorUngroupApplicator({
    mutationApi: {
      applyStudioUngroupMutationWithTransaction(options) {
        delegated = options;
        return {
          didApply: true,
          restoredElements: [{ id: 'node-1' }],
          restoredGroups: [{ id: 'group-1' }],
          transaction: { id: 'tx-ungroup' }
        };
      }
    },
    groupApi: { id: 'group' },
    transactionApi: { id: 'transaction' }
  });

  assert.deepEqual(
    applicator({ getElementId: () => 'node-1' }),
    {
      didApply: true,
      restoredElements: [{ id: 'node-1' }],
      restoredGroups: [{ id: 'group-1' }],
      transaction: { id: 'tx-ungroup' }
    }
  );
  assert.equal(delegated.groupApi.id, 'group');
  assert.equal(delegated.transactionApi.id, 'transaction');
  assert.equal(typeof delegated.getElementId, 'function');

  const legacyApplicator = ungroupTransaction.createStudioEditorUngroupApplicator({
    legacyApplyUngroup: () => ({
      didApply: true,
      restoredElements: [],
      restoredGroups: [],
      transaction: { id: 'legacy-ungroup' }
    })
  });
  assert.deepEqual(
    legacyApplicator({}),
    { didApply: true, restoredElements: [], restoredGroups: [], transaction: { id: 'legacy-ungroup' } }
  );
});
