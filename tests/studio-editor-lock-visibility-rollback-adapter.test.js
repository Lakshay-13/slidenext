const test = require('node:test');
const assert = require('node:assert/strict');

const rollbackAdapter = require('../shared/studio-editor-lock-visibility-rollback-adapter.js');

test('rollbackStudioEditorLockVisibilityMutation composes rollback dependencies', () => {
  const transaction = { id: 'tx-visibility' };
  const sourceDoc = { id: 'iframe-doc' };
  const getIframeDoc = () => sourceDoc;
  const getSlideById = () => null;
  const getElementByEditorId = () => null;
  const applyVisibilityState = () => {};
  let delegated = null;

  const result = rollbackAdapter.rollbackStudioEditorLockVisibilityMutation(transaction, sourceDoc, {
    rollbackApi: {
      rollbackStudioEditorLockVisibilityMutation(currentTransaction, currentSourceDoc, options) {
        delegated = { currentTransaction, currentSourceDoc, options };
        return true;
      }
    },
    transactionApi: { applyStudioEditorTransaction() {} },
    getIframeDoc,
    getSlideById,
    getElementByEditorId,
    applyVisibilityState
  });

  assert.equal(result, true);
  assert.equal(delegated.currentTransaction, transaction);
  assert.equal(delegated.currentSourceDoc, sourceDoc);
  assert.equal(typeof delegated.options.transactionApi.applyStudioEditorTransaction, 'function');
  assert.equal(delegated.options.getIframeDoc, getIframeDoc);
  assert.equal(delegated.options.getSlideById, getSlideById);
  assert.equal(delegated.options.getElementByEditorId, getElementByEditorId);
  assert.equal(delegated.options.applyVisibilityState, applyVisibilityState);
});

test('rollbackStudioEditorLockVisibilityMutation derives visibility application from element state', () => {
  let derived = null;
  rollbackAdapter.rollbackStudioEditorLockVisibilityMutation({}, null, {
    rollbackApi: {
      rollbackStudioEditorLockVisibilityMutation(_transaction, _sourceDoc, options) {
        derived = options.applyVisibilityState;
        return true;
      }
    },
    elementStateApi: {
      applyStudioElementVisibilityState(element, state) {
        return { element, state };
      }
    }
  });

  assert.deepEqual(derived({ id: 'node-1' }, { hidden: true }), {
    element: { id: 'node-1' },
    state: { hidden: true }
  });
});

test('rollbackStudioEditorLockVisibilityMutation fails closed without the rollback adapter', () => {
  assert.equal(rollbackAdapter.rollbackStudioEditorLockVisibilityMutation({}, null, {}), false);
});
