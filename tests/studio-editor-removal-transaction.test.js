const test = require('node:test');
const assert = require('node:assert/strict');

const removalTransaction = require('../shared/studio-editor-removal-transaction.js');

test('removal applicator centralizes transaction dependencies and preserves fallback callbacks', () => {
  let delegated = null;
  const selection = [{ id: 'element-1' }];
  const applyRemoval = removalTransaction.createStudioEditorRemovalApplicator({
    mutationApi: {
      applyStudioRemovalMutationWithTransaction(currentSelection, options) {
        delegated = { currentSelection, options };
        return { didRemove: true, removedCount: 1, transaction: { id: 'shared-removal' } };
      }
    },
    removalApi: { id: 'removal' },
    transactionApi: { id: 'transaction' }
  });

  assert.deepEqual(
    applyRemoval(selection, { getElementId: () => 'element-1' }),
    { didRemove: true, removedCount: 1, transaction: { id: 'shared-removal' } }
  );
  assert.equal(delegated.currentSelection, selection);
  assert.equal(delegated.options.removalApi.id, 'removal');
  assert.equal(delegated.options.transactionApi.id, 'transaction');
  assert.equal(delegated.options.getElementId(), 'element-1');

  const legacyApplicator = removalTransaction.createStudioEditorRemovalApplicator({
    legacyApplyRemoval: () => ({ didRemove: true, removedCount: 1, transaction: { id: 'legacy-removal' } })
  });
  assert.deepEqual(
    legacyApplicator(selection, {}),
    { didRemove: true, removedCount: 1, transaction: { id: 'legacy-removal' } }
  );
});

test('removal applicator fails closed without either adapter', () => {
  const applyRemoval = removalTransaction.createStudioEditorRemovalApplicator();

  assert.deepEqual(
    applyRemoval([], {}),
    { didRemove: false, removedCount: 0, transaction: null }
  );
});
