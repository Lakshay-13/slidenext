(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorLockVisibilityRollback = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function rollbackStudioEditorLockVisibilityMutation(transaction, sourceDoc = null, options = {}) {
    const transactionApi = options.transactionApi && typeof options.transactionApi === 'object'
      ? options.transactionApi
      : null;
    const getIframeDoc = typeof options.getIframeDoc === 'function'
      ? options.getIframeDoc
      : () => null;
    const getSlideById = typeof options.getSlideById === 'function'
      ? options.getSlideById
      : () => null;
    const getElementByEditorId = typeof options.getElementByEditorId === 'function'
      ? options.getElementByEditorId
      : () => null;
    const applyVisibilityState = typeof options.applyVisibilityState === 'function'
      ? options.applyVisibilityState
      : null;
    if (!transaction
      || !transactionApi
      || typeof transactionApi.applyStudioEditorTransaction !== 'function') {
      return false;
    }

    try {
      const rollbackSourceDoc = sourceDoc || getIframeDoc();
      const rollbackResult = transactionApi.applyStudioEditorTransaction(transaction, 'undo', {
        getElementById: (elementId) => {
          if (typeof elementId === 'string'
            && elementId.startsWith('slide:')) {
            return getSlideById(elementId.slice('slide:'.length), rollbackSourceDoc);
          }
          return getElementByEditorId(elementId, rollbackSourceDoc);
        },
        ...(applyVisibilityState ? { applyVisibilityState } : {})
      });
      return !!(rollbackResult && rollbackResult.didApply);
    } catch (error) {
      return false;
    }
  }

  return {
    rollbackStudioEditorLockVisibilityMutation
  };
});
