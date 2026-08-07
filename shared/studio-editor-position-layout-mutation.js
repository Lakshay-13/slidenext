(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorPositionLayoutMutation = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function applyStudioPositionLayoutMutationWithTransaction(nextItems, options = {}) {
    const transactionApi = options.transactionApi && typeof options.transactionApi === 'object'
      ? options.transactionApi
      : null;
    const applyStudioPositionLayoutWithTransaction = transactionApi
      && typeof transactionApi.applyStudioPositionLayoutWithTransaction === 'function'
      ? transactionApi.applyStudioPositionLayoutWithTransaction
      : null;
    if (!applyStudioPositionLayoutWithTransaction) {
      return { didApply: false, transaction: null };
    }

    const alignmentApi = options.alignmentApi && typeof options.alignmentApi === 'object'
      ? options.alignmentApi
      : null;
    const defaultApplyLayout = alignmentApi
      && typeof alignmentApi.applyStudioAlignmentLayout === 'function'
      ? alignmentApi.applyStudioAlignmentLayout
      : null;
    const getElementId = typeof options.getElementId === 'function'
      ? options.getElementId
      : (element) => element && element.dataset && element.dataset.editorId;
    const applyLayout = Object.prototype.hasOwnProperty.call(options, 'applyLayout')
      ? options.applyLayout
      : defaultApplyLayout;

    return applyStudioPositionLayoutWithTransaction(nextItems, {
      createPositionTransaction: typeof transactionApi.createStudioPositionTransaction === 'function'
        ? transactionApi.createStudioPositionTransaction
        : null,
      getElementId,
      applyLayout
    });
  }

  return {
    applyStudioPositionLayoutMutationWithTransaction
  };
});
