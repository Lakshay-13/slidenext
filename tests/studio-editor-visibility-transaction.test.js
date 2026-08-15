const test = require('node:test');
const assert = require('node:assert/strict');

const visibilityTransaction = require('../shared/studio-editor-visibility-transaction.js');

test('visibility applicator centralizes transaction dependencies and preserves fallback callbacks', () => {
  let delegated = null;
  const applicator = visibilityTransaction.createStudioEditorVisibilityApplicator({
    mutationApi: {
      applyStudioVisibilityMutationWithTransaction(selection, shouldHide, options) {
        delegated = { selection, shouldHide, options };
        return { didApply: true, transaction: { id: 'tx-visibility' } };
      }
    },
    visibilityApi: { id: 'visibility' },
    transactionApi: { id: 'transaction' },
    elementStateApi: { id: 'element-state' }
  });

  const selection = [{ id: 'node-1' }];
  assert.deepEqual(
    applicator(selection, true, { getElementId: () => 'node-1' }),
    { didApply: true, transaction: { id: 'tx-visibility' } }
  );
  assert.equal(delegated.selection, selection);
  assert.equal(delegated.shouldHide, true);
  assert.equal(delegated.options.visibilityApi.id, 'visibility');
  assert.equal(delegated.options.transactionApi.id, 'transaction');
  assert.equal(typeof delegated.options.getElementId, 'function');

  const legacyApplicator = visibilityTransaction.createStudioEditorVisibilityApplicator({
    legacyApplyVisibility: () => ({ didApply: true, transaction: { id: 'legacy-visibility' } })
  });
  assert.deepEqual(
    legacyApplicator(selection, false),
    { didApply: true, transaction: { id: 'legacy-visibility' } }
  );
});
