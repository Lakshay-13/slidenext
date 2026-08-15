const test = require('node:test');
const assert = require('node:assert/strict');

const elementInsertionTransaction = require('../shared/studio-editor-element-insertion-transaction.js');

test('element insertion applicator centralizes transaction dependencies and preserves fallback callbacks', () => {
  let delegated = null;
  const element = { id: 'element-1' };
  const applyInsertion = elementInsertionTransaction.createStudioEditorElementInsertionApplicator({
    mutationApi: {
      applyStudioElementInsertionMutationWithTransaction(type, options) {
        delegated = { type, options };
        return { element, transaction: { id: 'shared-element-insertion' } };
      }
    },
    insertionApi: { id: 'insertion' },
    transactionApi: { id: 'transaction' }
  });

  assert.deepEqual(
    applyInsertion('shape', { documentRef: { id: 'document' }, layoutMode: 'flow' }),
    { element, transaction: { id: 'shared-element-insertion' } }
  );
  assert.equal(delegated.type, 'shape');
  assert.equal(delegated.options.insertionApi.id, 'insertion');
  assert.equal(delegated.options.transactionApi.id, 'transaction');
  assert.equal(delegated.options.layoutMode, 'flow');

  const legacyApplicator = elementInsertionTransaction.createStudioEditorElementInsertionApplicator({
    legacyApplyInsertion: () => ({ element, transaction: { id: 'legacy-element-insertion' } })
  });
  assert.deepEqual(
    legacyApplicator('text', {}),
    { element, transaction: { id: 'legacy-element-insertion' } }
  );
});

test('element insertion applicator fails closed without either adapter', () => {
  const applyInsertion = elementInsertionTransaction.createStudioEditorElementInsertionApplicator();

  assert.deepEqual(applyInsertion('shape', {}), { element: null, transaction: null });
});
