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

  function createStudioEditorPositionLayoutApplicator(options = {}) {
    const applyPositionTransaction = typeof options.applyPositionTransaction === 'function'
      ? options.applyPositionTransaction
      : applyStudioEditorPositionLayoutMutationWithTransaction;
    const mutationApi = options.mutationApi && typeof options.mutationApi === 'object'
      ? options.mutationApi
      : null;
    const transactionApi = options.transactionApi && typeof options.transactionApi === 'object'
      ? options.transactionApi
      : null;
    const alignmentApi = options.alignmentApi && typeof options.alignmentApi === 'object'
      ? options.alignmentApi
      : null;
    const legacyApplyPositionLayout = typeof options.legacyApplyPositionLayout === 'function'
      ? options.legacyApplyPositionLayout
      : () => ({ didApply: false, transaction: null });
    const canApplyPositionTransaction = mutationApi
      && (typeof options.applyPositionTransaction === 'function'
        || typeof mutationApi.applyStudioPositionLayoutMutationWithTransaction === 'function');

    return (nextItems, mutationOptions = {}) => {
      if (canApplyPositionTransaction) {
        return applyPositionTransaction(nextItems, {
          mutationApi,
          transactionApi,
          alignmentApi,
          ...mutationOptions
        });
      }
      return legacyApplyPositionLayout(nextItems, mutationOptions);
    };
  }

  return {
    applyStudioEditorPositionLayoutMutationWithTransaction,
    createStudioEditorPositionLayoutApplicator
  };
});
