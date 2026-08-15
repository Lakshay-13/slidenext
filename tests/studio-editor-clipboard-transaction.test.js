const test = require('node:test');
const assert = require('node:assert/strict');

const clipboardTransaction = require('../shared/studio-editor-clipboard-transaction.js');

test('clipboard insertion applicator centralizes transaction dependencies and preserves fallback callbacks', () => {
  let delegated = null;
  const applicator = clipboardTransaction.createStudioEditorClipboardInsertionApplicator({
    mutationApi: {
      applyStudioClipboardInsertionWithTransaction(plans, slide, options) {
        delegated = { plans, slide, options };
        return { inserted: [{ id: 'node-1' }], transaction: { id: 'tx-clipboard' } };
      }
    },
    clipboardApi: { id: 'clipboard' },
    transactionApi: { id: 'transaction' }
  });

  const plans = [{ element: { id: 'node-1' } }];
  const slide = { id: 'slide-1' };
  assert.deepEqual(
    applicator(plans, slide, { getElementId: () => 'node-1' }),
    { inserted: [{ id: 'node-1' }], transaction: { id: 'tx-clipboard' } }
  );
  assert.equal(delegated.plans, plans);
  assert.equal(delegated.slide, slide);
  assert.equal(delegated.options.clipboardApi.id, 'clipboard');
  assert.equal(delegated.options.transactionApi.id, 'transaction');
  assert.equal(typeof delegated.options.getElementId, 'function');

  const legacyApplicator = clipboardTransaction.createStudioEditorClipboardInsertionApplicator({
    legacyApplyInsertion: () => ({ inserted: [{ id: 'legacy' }], transaction: null })
  });
  assert.deepEqual(
    legacyApplicator(plans, slide),
    { inserted: [{ id: 'legacy' }], transaction: null }
  );
});
