(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorLayerOrderRollbackAdapter = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function rollbackStudioEditorLayerOrderMutation(transaction, sourceDoc = null, options = {}) {
    const rollbackApi = options.rollbackApi && typeof options.rollbackApi === 'object'
      ? options.rollbackApi
      : null;
    const rollbackMutation = rollbackApi
      && typeof rollbackApi.rollbackStudioEditorLayerOrderMutation === 'function'
      ? rollbackApi.rollbackStudioEditorLayerOrderMutation
      : null;
    if (!rollbackMutation) {
      return false;
    }

    return rollbackMutation(transaction, sourceDoc, {
      transactionApi: options.transactionApi && typeof options.transactionApi === 'object'
        ? options.transactionApi
        : null,
      getIframeDoc: typeof options.getIframeDoc === 'function' ? options.getIframeDoc : null,
      getElementByEditorId: typeof options.getElementByEditorId === 'function'
        ? options.getElementByEditorId
        : null
    });
  }

  return {
    rollbackStudioEditorLayerOrderMutation
  };
});
