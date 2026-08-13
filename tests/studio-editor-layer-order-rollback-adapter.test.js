const test = require('node:test');
const assert = require('node:assert/strict');

const rollbackAdapter = require('../shared/studio-editor-layer-order-rollback-adapter.js');

test('rollbackStudioEditorLayerOrderMutation composes rollback dependencies', () => {
  const transaction = { id: 'tx-layer' };
  const sourceDoc = { id: 'iframe-doc' };
  const getIframeDoc = () => sourceDoc;
  const getElementByEditorId = () => null;
  let delegated = null;

  const result = rollbackAdapter.rollbackStudioEditorLayerOrderMutation(transaction, sourceDoc, {
    rollbackApi: {
      rollbackStudioEditorLayerOrderMutation(currentTransaction, currentSourceDoc, options) {
        delegated = { currentTransaction, currentSourceDoc, options };
        return true;
      }
    },
    transactionApi: { applyStudioEditorTransaction() {} },
    getIframeDoc,
    getElementByEditorId
  });

  assert.equal(result, true);
  assert.equal(delegated.currentTransaction, transaction);
  assert.equal(delegated.currentSourceDoc, sourceDoc);
  assert.equal(typeof delegated.options.transactionApi.applyStudioEditorTransaction, 'function');
  assert.equal(delegated.options.getIframeDoc, getIframeDoc);
  assert.equal(delegated.options.getElementByEditorId, getElementByEditorId);
});

test('rollbackStudioEditorLayerOrderMutation fails closed without the rollback adapter', () => {
  assert.equal(rollbackAdapter.rollbackStudioEditorLayerOrderMutation({}, null, {}), false);
});
