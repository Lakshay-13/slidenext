const test = require('node:test');
const assert = require('node:assert/strict');

const groupTransaction = require('../shared/studio-editor-group-transaction.js');

test('group applicator centralizes transaction dependencies and preserves fallback callbacks', () => {
  let delegated = null;
  const assignElementId = () => 'assigned-group';
  const prepareGroup = () => {};
  const applicator = groupTransaction.createStudioEditorGroupApplicator({
    mutationApi: {
      applyStudioGroupMutationWithTransaction(options) {
        delegated = options;
        return { didApply: true, group: { id: 'group-1' }, transaction: { id: 'tx-group' } };
      }
    },
    groupApi: { id: 'group' },
    transactionApi: { id: 'transaction' },
    assignElementId,
    prepareGroup
  });

  assert.deepEqual(
    applicator({ getElementId: () => 'node-1' }),
    { didApply: true, group: { id: 'group-1' }, transaction: { id: 'tx-group' } }
  );
  assert.equal(delegated.groupApi.id, 'group');
  assert.equal(delegated.transactionApi.id, 'transaction');
  assert.equal(delegated.assignElementId, assignElementId);
  assert.equal(delegated.prepareGroup, prepareGroup);
  assert.equal(typeof delegated.getElementId, 'function');

  const legacyApplicator = groupTransaction.createStudioEditorGroupApplicator({
    legacyApplyGroup: () => ({ didApply: true, group: { id: 'legacy-group' }, transaction: null })
  });
  assert.deepEqual(
    legacyApplicator({}),
    { didApply: true, group: { id: 'legacy-group' }, transaction: null }
  );
});
