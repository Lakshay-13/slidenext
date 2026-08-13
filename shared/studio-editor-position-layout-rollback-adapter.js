(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorPositionLayoutRollbackAdapter = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function rollbackStudioEditorPositionLayoutMutation(transaction, sourceDoc = null, options = {}) {
    const rollbackApi = options.rollbackApi && typeof options.rollbackApi === 'object'
      ? options.rollbackApi
      : null;
    const rollbackMutation = rollbackApi
      && typeof rollbackApi.rollbackStudioEditorPositionLayoutMutation === 'function'
      ? rollbackApi.rollbackStudioEditorPositionLayoutMutation
      : null;
    if (!rollbackMutation) {
      return false;
    }

    return rollbackMutation(transaction, sourceDoc, {
      transactionApi: options.transactionApi && typeof options.transactionApi === 'object'
        ? options.transactionApi
        : null,
      getIframeDoc: typeof options.getIframeDoc === 'function' ? options.getIframeDoc : null,
      getSlideById: typeof options.getSlideById === 'function' ? options.getSlideById : null,
      getElementByEditorId: typeof options.getElementByEditorId === 'function'
        ? options.getElementByEditorId
        : null
    });
  }

  return {
    rollbackStudioEditorPositionLayoutMutation
  };
});
