const test = require('node:test');
const assert = require('node:assert/strict');

const styleMutation = require('../shared/studio-editor-style-mutation.js');
const styleState = require('../shared/studio-editor-style.js');
const studioTransaction = require('../shared/studio-editor-transaction.js');

test('applyStudioStyleMutationWithTransaction delegates style and transaction dependencies', () => {
  const selection = [{ dataset: { editorId: 'node-1' }, style: {} }];
  let delegated = null;

  const result = styleMutation.applyStudioStyleMutationWithTransaction(
    styleState,
    selection,
    'color',
    '#fff',
    {
      transactionApi: {
        createStudioStyleTransaction: studioTransaction.createStudioStyleTransaction,
        createStudioPropertyTransaction: studioTransaction.createStudioPropertyTransaction
      },
      getElementId: (element) => element.dataset.editorId
    }
  );

  assert.equal(result.didApply, true);
  assert.equal(selection[0].style.color, '#fff');
  assert.deepEqual(result.transaction.operations[0].after, { color: '#fff' });

  const customStyleApi = {
    applyStudioStyleMutationWithTransaction(currentSelection, prop, value, options) {
      delegated = { currentSelection, prop, value, options };
      return { didApply: true, displayValue: value, transaction: { id: 'tx-style' } };
    }
  };
  const delegatedResult = styleMutation.applyStudioStyleMutationWithTransaction(
    customStyleApi,
    selection,
    'weight',
    '700',
    { transactionApi: {} }
  );
  assert.deepEqual(delegatedResult, { didApply: true, displayValue: '700', transaction: { id: 'tx-style' } });
  assert.equal(delegated.currentSelection, selection);
  assert.equal(delegated.prop, 'weight');
  assert.equal(delegated.value, '700');
});

test('applyStudioStyleMutationWithTransaction preserves the unsupported-style fallback', () => {
  assert.deepEqual(
    styleMutation.applyStudioStyleMutationWithTransaction(null, [], 'color', '#fff'),
    { didApply: false, displayValue: '#fff', transaction: null }
  );
});

test('applyStudioStyleMutationWithTransaction delegates chart values to the chart mutation adapter', () => {
  const selection = [{ dataset: { editorId: 'chart-1' } }];
  let delegated = null;
  const result = styleMutation.applyStudioStyleMutationWithTransaction(
    styleState,
    selection,
    'chartValues',
    '10,20',
    {
      chartApi: {
        applyStudioChartValuesMutationWithTransaction(currentSelection, value, options) {
          delegated = { currentSelection, value, options };
          return { didApply: true, displayValue: value, transaction: { id: 'tx-chart' } };
        }
      },
      transactionApi: { id: 'transactions' },
      getElementId: (element) => element.dataset.editorId
    }
  );

  assert.deepEqual(result, {
    didApply: true,
    displayValue: '10,20',
    transaction: { id: 'tx-chart' }
  });
  assert.equal(delegated.currentSelection, selection);
  assert.equal(delegated.value, '10,20');
  assert.equal(delegated.options.transactionApi.id, 'transactions');
});
