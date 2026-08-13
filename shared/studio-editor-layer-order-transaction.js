(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorLayerOrderTransaction = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function applyStudioEditorLayerOrderMutationWithTransaction(
    slide,
    initialOrder,
    nextOrder,
    options = {}
  ) {
    const mutationApi = options.mutationApi && typeof options.mutationApi === 'object'
      ? options.mutationApi
      : null;
    const applyMutation = mutationApi
      && typeof mutationApi.applyStudioLayerOrderMutationWithTransaction === 'function'
      ? mutationApi.applyStudioLayerOrderMutationWithTransaction
      : null;
    if (!applyMutation) {
      return {
        didApply: false,
        transaction: null
      };
    }

    const getElementId = typeof options.getElementId === 'function'
      ? options.getElementId
      : (element) => {
          if (typeof options.assignEditorElementId === 'function') {
            const assignedId = options.assignEditorElementId(element);
            if (assignedId) return assignedId;
          }
          return element && element.dataset && element.dataset.editorId;
        };
    return applyMutation(slide, initialOrder, nextOrder, {
      layerOrderApi: options.layerOrderApi && typeof options.layerOrderApi === 'object'
        ? options.layerOrderApi
        : null,
      transactionApi: options.transactionApi && typeof options.transactionApi === 'object'
        ? options.transactionApi
        : null,
      getElementId,
      applyLayerOrder: typeof options.applyLayerOrder === 'function'
        ? options.applyLayerOrder
        : null
    });
  }

  return {
    applyStudioEditorLayerOrderMutationWithTransaction
  };
});
