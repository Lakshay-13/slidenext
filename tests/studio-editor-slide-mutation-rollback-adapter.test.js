const test = require('node:test');
const assert = require('node:assert/strict');

const rollbackAdapter = require('../shared/studio-editor-slide-mutation-rollback-adapter.js');

test('rollbackStudioEditorSlideMutation composes rollback dependencies', () => {
  const transaction = { id: 'tx-slide' };
  const sourceDoc = { id: 'iframe-doc' };
  const callbacks = {
    getIframeDoc: () => sourceDoc,
    getSlideById: () => null,
    getSlides: () => [],
    getElementByEditorId: () => null,
    makeElementsHoverable: () => {},
    generateThumbnails: () => {}
  };
  let delegated = null;

  const result = rollbackAdapter.rollbackStudioEditorSlideMutation(transaction, sourceDoc, {
    rollbackApi: {
      rollbackStudioEditorSlideMutation(currentTransaction, currentSourceDoc, options) {
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
  assert.equal(delegated.options.getSlides, callbacks.getSlides);
  assert.equal(delegated.options.getElementByEditorId, callbacks.getElementByEditorId);
  assert.equal(delegated.options.makeElementsHoverable, callbacks.makeElementsHoverable);
  assert.equal(delegated.options.generateThumbnails, callbacks.generateThumbnails);
});

test('rollbackStudioEditorSlideMutation fails closed without the rollback adapter', () => {
  assert.equal(
    rollbackAdapter.rollbackStudioEditorSlideMutation({}, null, {}),
    false
  );
});
