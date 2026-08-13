const test = require('node:test');
const assert = require('node:assert/strict');

const elementInsertionMutation = require('../shared/studio-editor-element-insertion-mutation.js');
const studioTransaction = require('../shared/studio-editor-transaction.js');

test('applyStudioElementInsertionMutationWithTransaction delegates insertion and markup transaction dependencies', () => {
  const slide = { id: 'slide-1' };
  const element = { id: 'node-1' };
  let delegated = null;

  const result = elementInsertionMutation.applyStudioElementInsertionMutationWithTransaction('shape', {
    insertionApi: {
      applyStudioElementInsertion(type, options) {
        delegated = { type, options };
        return { element, transaction: { id: 'tx-element' } };
      }
    },
    transactionApi: {
      createStudioMarkupTransactionCapture: studioTransaction.createStudioMarkupTransactionCapture
    },
    documentRef: { id: 'document' },
    slide,
    offset: 12,
    layoutMode: 'flow',
    prepareElement() {},
    transactionElementId: 'slide-1',
    getElementId: () => 'node-1'
  });

  assert.deepEqual(result, { element, transaction: { id: 'tx-element' } });
  assert.equal(delegated.type, 'shape');
  assert.equal(delegated.options.slide, slide);
  assert.equal(delegated.options.offset, 12);
  assert.equal(delegated.options.layoutMode, 'flow');
  assert.equal(typeof delegated.options.createMarkupTransactionCapture, 'function');
  assert.equal(delegated.options.createElementPresenceTransaction, null);
  assert.equal(typeof delegated.options.prepareElement, 'function');
});

test('applyStudioElementInsertionMutationWithTransaction forwards scoped element presence transactions', () => {
  const element = { id: 'node-1' };
  let delegated = null;
  const createElementPresenceTransaction = () => ({ id: 'tx-element-presence' });

  const result = elementInsertionMutation.applyStudioElementInsertionMutationWithTransaction('shape', {
    insertionApi: {
      applyStudioElementInsertion(type, options) {
        delegated = { type, options };
        return { element, transaction: { id: 'tx-element-presence' } };
      }
    },
    transactionApi: { createStudioElementPresenceTransaction: createElementPresenceTransaction },
    documentRef: { id: 'document' },
    slide: { id: 'slide-1' },
    transactionElementId: 'slide:slide-1'
  });

  assert.deepEqual(result, { element, transaction: { id: 'tx-element-presence' } });
  assert.equal(delegated.type, 'shape');
  assert.equal(delegated.options.createElementPresenceTransaction, createElementPresenceTransaction);
});

test('applyStudioElementInsertionMutationWithTransaction fails closed without a shared insertion adapter', () => {
  assert.deepEqual(
    elementInsertionMutation.applyStudioElementInsertionMutationWithTransaction('shape', {}),
    { element: null, transaction: null }
  );
});
