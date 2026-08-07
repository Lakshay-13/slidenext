const test = require('node:test');
const assert = require('node:assert/strict');

const clipboardMutation = require('../shared/studio-editor-clipboard-mutation.js');
const studioTransaction = require('../shared/studio-editor-transaction.js');

test('applyStudioClipboardInsertionWithTransaction delegates insertion and markup transaction dependencies', () => {
  const insertionPlans = [{ id: 'plan-1' }];
  const slide = { id: 'slide-1' };
  let delegated = null;

  const result = clipboardMutation.applyStudioClipboardInsertionWithTransaction(
    insertionPlans,
    slide,
    {
      clipboardApi: {
        applyStudioClipboardInsertion(currentPlans, options) {
          delegated = { currentPlans, options };
          return { inserted: [{ id: 'node-1' }], transaction: { id: 'tx-clipboard' } };
        }
      },
      transactionApi: {
        createStudioMarkupTransactionCapture: studioTransaction.createStudioMarkupTransactionCapture
      },
      getElementId: () => 'node-1'
    }
  );

  assert.deepEqual(result, {
    inserted: [{ id: 'node-1' }],
    transaction: { id: 'tx-clipboard' }
  });
  assert.equal(delegated.currentPlans, insertionPlans);
  assert.equal(delegated.options.slide, slide);
  assert.equal(typeof delegated.options.createMarkupTransactionCapture, 'function');
  assert.equal(typeof delegated.options.getElementId, 'function');
});

test('applyStudioClipboardInsertionWithTransaction fails closed without a shared clipboard adapter', () => {
  assert.deepEqual(
    clipboardMutation.applyStudioClipboardInsertionWithTransaction([], {}, {}),
    { inserted: [], transaction: null }
  );
});
