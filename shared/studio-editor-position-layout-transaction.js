(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorPositionLayoutTransaction = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function applyStudioEditorPositionLayoutMutationWithTransaction(nextItems, options = {}) {
    const mutationApi = options.mutationApi && typeof options.mutationApi === 'object'
      ? options.mutationApi
      : null;
    const applyMutation = mutationApi
      && typeof mutationApi.applyStudioPositionLayoutMutationWithTransaction === 'function'
      ? mutationApi.applyStudioPositionLayoutMutationWithTransaction
      : null;
    if (!applyMutation) {
      return { didApply: false, transaction: null };
    }

    const getElementId = typeof options.getElementId === 'function'
      ? options.getElementId
      : (element) => {
          if (typeof options.assignEditorElementId === 'function') {
            return options.assignEditorElementId(element);
          }
          return element && element.dataset && element.dataset.editorId;
        };
    return applyMutation(nextItems, {
      transactionApi: options.transactionApi && typeof options.transactionApi === 'object'
        ? options.transactionApi
        : null,
      alignmentApi: options.alignmentApi && typeof options.alignmentApi === 'object'
        ? options.alignmentApi
        : null,
      getElementId,
      ...(Object.prototype.hasOwnProperty.call(options, 'applyLayout')
        ? { applyLayout: options.applyLayout }
        : {})
    });
  }

  return {
    applyStudioEditorPositionLayoutMutationWithTransaction
  };
});
