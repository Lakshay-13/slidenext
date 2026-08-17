(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorSlideMutationRollbackComposition = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function createStudioEditorSlideMutationRollbackComposition(options = {}) {
    const rollbackAdapter = options.rollbackAdapter
      && typeof options.rollbackAdapter === 'object'
      ? options.rollbackAdapter
      : null;
    const rollback = rollbackAdapter
      && typeof rollbackAdapter.rollbackStudioEditorSlideMutation === 'function'
      ? rollbackAdapter.rollbackStudioEditorSlideMutation
      : null;
    if (!rollback) {
      return { rollback: () => false };
    }

    return {
      rollback: (transaction, sourceDoc = null) => rollback(transaction, sourceDoc, {
        rollbackApi: options.rollbackApi,
        transactionApi: options.transactionApi,
        getIframeDoc: options.getIframeDoc,
        getSlideById: options.getSlideById,
        getSlides: options.getSlides,
        getElementByEditorId: options.getElementByEditorId,
        makeElementsHoverable: options.makeElementsHoverable,
        generateThumbnails: options.generateThumbnails
      })
    };
  }

  return { createStudioEditorSlideMutationRollbackComposition };
});
