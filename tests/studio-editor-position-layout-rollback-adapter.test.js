const test = require('node:test');
const assert = require('node:assert/strict');

const rollbackAdapter = require('../shared/studio-editor-position-layout-rollback-adapter.js');

test('rollbackStudioEditorPositionLayoutMutation composes rollback dependencies', () => {
  const transaction = { id: 'tx-position' };
  const sourceDoc = { id: 'iframe-doc' };
  const callbacks = {
    getIframeDoc: () => sourceDoc,
    getSlideById: () => null,
    getElementByEditorId: () => null
  };
  let delegated = null;

  const result = rollbackAdapter.rollbackStudioEditorPositionLayoutMutation(transaction, sourceDoc, {
    rollbackApi: {
      rollbackStudioEditorPositionLayoutMutation(currentTransaction, currentSourceDoc, options) {
        delegated = { currentTransaction, currentSourceDoc, options };
        return true;
      }
    },
    transactionApi: { applyStudioEditorTransaction() {} },
    ...callbacks
  });

  assert.equal(result, true);
  assert.equal(delegated.currentTransaction, transaction);
  assert.equal(delegated.currentSourceDoc, sourceDoc);
  assert.equal(typeof delegated.options.transactionApi.applyStudioEditorTransaction, 'function');
  assert.equal(delegated.options.getIframeDoc, callbacks.getIframeDoc);
  assert.equal(delegated.options.getSlideById, callbacks.getSlideById);
  assert.equal(delegated.options.getElementByEditorId, callbacks.getElementByEditorId);
});

test('rollbackStudioEditorPositionLayoutMutation fails closed without the rollback adapter', () => {
  assert.equal(rollbackAdapter.rollbackStudioEditorPositionLayoutMutation({}, null, {}), false);
});
