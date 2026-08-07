const test = require('node:test');
const assert = require('node:assert/strict');

const removalMutation = require('../shared/studio-editor-removal-mutation.js');
const removalState = require('../shared/studio-editor-removal.js');
const studioTransaction = require('../shared/studio-editor-transaction.js');

test('applyStudioRemovalMutationWithTransaction delegates removal and markup transaction dependencies', () => {
  const selection = [{ dataset: { editorId: 'node-1' }, isConnected: true }];
  let delegated = null;

  const result = removalMutation.applyStudioRemovalMutationWithTransaction(
    selection,
    {
      removalApi: {
        removeStudioElements(currentSelection, options) {
          delegated = { currentSelection, options };
          return { didRemove: true, removedCount: 1, transaction: { id: 'tx-removal' } };
        }
      },
      transactionApi: {
        createStudioMarkupTransactionCapture: studioTransaction.createStudioMarkupTransactionCapture
      },
      getElementId: (element) => element.dataset.editorId,
      removeElement() {}
    }
  );

  assert.deepEqual(result, { didRemove: true, removedCount: 1, transaction: { id: 'tx-removal' } });
  assert.equal(delegated.currentSelection, selection);
  assert.equal(typeof delegated.options.createMarkupTransactionCapture, 'function');
  assert.equal(typeof delegated.options.removeElement, 'function');
});

test('applyStudioRemovalMutationWithTransaction preserves the shared removal behavior', () => {
  const element = { isConnected: true, dataset: { editorId: 'node-1' }, remove() { this.isConnected = false; } };
  const result = removalMutation.applyStudioRemovalMutationWithTransaction([element], {
    removalApi: removalState,
    removeElement: (target) => target.remove(),
    getElementId: (target) => target.dataset.editorId
  });

  assert.equal(result.didRemove, true);
  assert.equal(result.removedCount, 1);
  assert.equal(element.isConnected, false);
});

test('applyStudioRemovalMutationWithTransaction fails closed without a shared removal adapter', () => {
  assert.deepEqual(
    removalMutation.applyStudioRemovalMutationWithTransaction([], {}),
    { didRemove: false, removedCount: 0, transaction: null }
  );
});
