const test = require('node:test');
const assert = require('node:assert/strict');

const rollbackComposition = require('../shared/studio-editor-slide-mutation-rollback-composition.js');

test('slide mutation rollback composition forwards the rollback dependency set', () => {
  const transaction = { kind: 'transaction' };
  const sourceDoc = { id: 'iframe-doc' };
  const rollbackApi = { name: 'rollback' };
  const transactionApi = { name: 'transaction' };
  const getIframeDoc = () => sourceDoc;
  const getSlideById = () => null;
  const getSlides = () => [];
  const getElementByEditorId = () => null;
  const makeElementsHoverable = () => {};
  const generateThumbnails = () => {};
  let received = null;

  const controller = rollbackComposition.createStudioEditorSlideMutationRollbackComposition({
    rollbackAdapter: {
      rollbackStudioEditorSlideMutation(currentTransaction, currentSourceDoc, options) {
        received = { currentTransaction, currentSourceDoc, options };
        return true;
      }
    },
    rollbackApi,
    transactionApi,
    getIframeDoc,
    getSlideById,
    getSlides,
    getElementByEditorId,
    makeElementsHoverable,
    generateThumbnails
  });

  assert.equal(controller.rollback(transaction, sourceDoc), true);
  assert.equal(received.currentTransaction, transaction);
  assert.equal(received.currentSourceDoc, sourceDoc);
  assert.deepEqual(received.options, {
    rollbackApi,
    transactionApi,
    getIframeDoc,
    getSlideById,
    getSlides,
    getElementByEditorId,
    makeElementsHoverable,
    generateThumbnails
  });
});

test('slide mutation rollback composition fails closed without an adapter', () => {
  const controller = rollbackComposition.createStudioEditorSlideMutationRollbackComposition();

  assert.equal(controller.rollback({ kind: 'transaction' }), false);
});
