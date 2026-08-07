(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorLayerOrderMutation = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function applyStudioLayerOrderMutationWithTransaction(slide, initialOrder, nextOrder, options = {}) {
    const layerOrderApi = options.layerOrderApi && typeof options.layerOrderApi === 'object'
      ? options.layerOrderApi
      : null;
    const applyStudioLayerOrderWithTransaction = layerOrderApi
      && typeof layerOrderApi.applyStudioLayerOrderWithTransaction === 'function'
      ? layerOrderApi.applyStudioLayerOrderWithTransaction
      : null;
    if (!applyStudioLayerOrderWithTransaction) {
      return {
        didApply: false,
        transaction: null
      };
    }

    const transactionApi = options.transactionApi && typeof options.transactionApi === 'object'
      ? options.transactionApi
      : null;
    const applyStudioLayerOrderMutation = layerOrderApi
      && typeof layerOrderApi.applyStudioLayerOrderMutation === 'function'
      ? layerOrderApi.applyStudioLayerOrderMutation
      : null;
    const createStudioStyleTransaction = transactionApi
      && typeof transactionApi.createStudioStyleTransaction === 'function'
      ? transactionApi.createStudioStyleTransaction
      : null;
    const getElementId = typeof options.getElementId === 'function'
      ? options.getElementId
      : (element) => element && element.dataset && element.dataset.editorId;
    const applyLayerOrder = typeof options.applyLayerOrder === 'function'
      ? options.applyLayerOrder
      : null;

    return applyStudioLayerOrderWithTransaction(slide, initialOrder, nextOrder, {
      applyStudioLayerOrderMutation,
      createStudioStyleTransaction,
      getElementId,
      applyLayerOrder
    });
  }

  return {
    applyStudioLayerOrderMutationWithTransaction
  };
});
