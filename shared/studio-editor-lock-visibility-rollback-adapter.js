(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorLockVisibilityRollbackAdapter = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function rollbackStudioEditorLockVisibilityMutation(transaction, sourceDoc = null, options = {}) {
    const rollbackApi = options.rollbackApi && typeof options.rollbackApi === 'object'
      ? options.rollbackApi
      : null;
    const rollbackMutation = rollbackApi
      && typeof rollbackApi.rollbackStudioEditorLockVisibilityMutation === 'function'
      ? rollbackApi.rollbackStudioEditorLockVisibilityMutation
      : null;
    if (!rollbackMutation) {
      return false;
    }

    const elementStateApi = options.elementStateApi && typeof options.elementStateApi === 'object'
      ? options.elementStateApi
      : null;
    const applyVisibilityState = typeof options.applyVisibilityState === 'function'
      ? options.applyVisibilityState
      : elementStateApi
        && typeof elementStateApi.applyStudioElementVisibilityState === 'function'
        ? (element, state) => elementStateApi.applyStudioElementVisibilityState(element, state)
        : null;
    return rollbackMutation(transaction, sourceDoc, {
      transactionApi: options.transactionApi && typeof options.transactionApi === 'object'
        ? options.transactionApi
        : null,
      getIframeDoc: typeof options.getIframeDoc === 'function' ? options.getIframeDoc : null,
      getSlideById: typeof options.getSlideById === 'function' ? options.getSlideById : null,
      getElementByEditorId: typeof options.getElementByEditorId === 'function'
        ? options.getElementByEditorId
        : null,
      applyVisibilityState
    });
  }

  return {
    rollbackStudioEditorLockVisibilityMutation
  };
});
