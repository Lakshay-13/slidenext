(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorLayerOrderRollback = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function rollbackStudioEditorLayerOrderMutation(transaction, sourceDoc = null, options = {}) {
    const transactionApi = options.transactionApi && typeof options.transactionApi === 'object'
      ? options.transactionApi
      : null;
    const getIframeDoc = typeof options.getIframeDoc === 'function'
      ? options.getIframeDoc
      : () => null;
    const getElementByEditorId = typeof options.getElementByEditorId === 'function'
      ? options.getElementByEditorId
      : () => null;
    if (!transaction
      || !transactionApi
      || typeof transactionApi.applyStudioEditorTransaction !== 'function') {
      return false;
    }

    try {
      const rollbackSourceDoc = sourceDoc || getIframeDoc();
      const rollbackResult = transactionApi.applyStudioEditorTransaction(transaction, 'undo', {
        getElementById: (elementId) => getElementByEditorId(elementId, rollbackSourceDoc)
      });
      return !!(rollbackResult && rollbackResult.didApply);
    } catch (error) {
      return false;
    }
  }

  return {
    rollbackStudioEditorLayerOrderMutation
  };
});
