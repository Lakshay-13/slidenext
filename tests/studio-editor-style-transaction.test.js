const test = require('node:test');
const assert = require('node:assert/strict');

const styleTransaction = require('../shared/studio-editor-style-transaction.js');

test('style applicator centralizes mutation dependencies and preserves fallback callbacks', () => {
  let delegated = null;
  const styleApi = { id: 'style' };
  const applicator = styleTransaction.createStudioEditorStyleApplicator({
    styleApi,
    mutationApi: {
      applyStudioStyleMutationWithTransaction(currentStyleApi, selection, prop, value, options) {
        delegated = { currentStyleApi, selection, prop, value, options };
        return { didApply: true, displayValue: '24', transaction: { id: 'tx-style' } };
      }
    },
    transactionApi: { id: 'transaction' },
    chartApi: { id: 'chart' }
  });

  const selection = [{ id: 'node-1' }];
  assert.deepEqual(
    applicator(null, selection, 'size', 24, { getElementId: () => 'node-1' }),
    { didApply: true, displayValue: '24', transaction: { id: 'tx-style' } }
  );
  assert.equal(delegated.currentStyleApi, styleApi);
  assert.equal(delegated.selection, selection);
  assert.equal(delegated.prop, 'size');
  assert.equal(delegated.value, 24);
  assert.equal(delegated.options.transactionApi.id, 'transaction');
  assert.equal(delegated.options.chartApi.id, 'chart');
  assert.equal(typeof delegated.options.getElementId, 'function');

  const legacyApplicator = styleTransaction.createStudioEditorStyleApplicator({
    legacyApplyStyle: () => ({ didApply: true, displayValue: 'legacy', transaction: null })
  });
  assert.deepEqual(
    legacyApplicator(styleApi, selection, 'color', '#fff'),
    { didApply: true, displayValue: 'legacy', transaction: null }
  );
});
