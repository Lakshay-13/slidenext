(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorSlideMutationRollbackAdapter = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function rollbackStudioEditorSlideMutation(transaction, sourceDoc = null, options = {}) {
    const rollbackApi = options.rollbackApi && typeof options.rollbackApi === 'object'
      ? options.rollbackApi
      : null;
    const rollbackMutation = rollbackApi
      && typeof rollbackApi.rollbackStudioEditorSlideMutation === 'function'
      ? rollbackApi.rollbackStudioEditorSlideMutation
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
      getSlides: typeof options.getSlides === 'function' ? options.getSlides : null,
      getElementByEditorId: typeof options.getElementByEditorId === 'function'
        ? options.getElementByEditorId
        : null,
      makeElementsHoverable: typeof options.makeElementsHoverable === 'function'
        ? options.makeElementsHoverable
        : null,
      generateThumbnails: typeof options.generateThumbnails === 'function'
        ? options.generateThumbnails
        : null
    });
  }

  return {
    rollbackStudioEditorSlideMutation
  };
});
