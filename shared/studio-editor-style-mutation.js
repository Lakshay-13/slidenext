(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorStyleMutation = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function applyStudioStyleMutationWithTransaction(styleApi, selection, prop, value, options = {}) {
    const resolvedStyleApi = styleApi && typeof styleApi === 'object' ? styleApi : null;
    const applyStudioStyleMutationWithTransaction = resolvedStyleApi
      && typeof resolvedStyleApi.applyStudioStyleMutationWithTransaction === 'function'
      ? resolvedStyleApi.applyStudioStyleMutationWithTransaction
      : null;
    if (!applyStudioStyleMutationWithTransaction) {
      return { didApply: false, displayValue: `${value}`, transaction: null };
    }

    const transactionApi = options.transactionApi && typeof options.transactionApi === 'object'
      ? options.transactionApi
      : null;
    const createStyleTransaction = transactionApi
      && typeof transactionApi.createStudioStyleTransaction === 'function'
      ? transactionApi.createStudioStyleTransaction
      : null;
    const createPropertyTransaction = transactionApi
      && typeof transactionApi.createStudioPropertyTransaction === 'function'
      ? transactionApi.createStudioPropertyTransaction
      : null;
    const getElementId = typeof options.getElementId === 'function'
      ? options.getElementId
      : (element) => element && element.dataset && element.dataset.editorId;
    const applyStudioStyleMutation = resolvedStyleApi
      && typeof resolvedStyleApi.applyStudioStyleMutation === 'function'
      ? resolvedStyleApi.applyStudioStyleMutation
      : null;

    const mutation = applyStudioStyleMutationWithTransaction(selection, prop, value, {
      createStyleTransaction,
      createPropertyTransaction,
      getElementId,
      applyStudioStyleMutation
    });
    return mutation && typeof mutation === 'object'
      ? mutation
      : { didApply: false, displayValue: `${value}`, transaction: null };
  }

  return {
    applyStudioStyleMutationWithTransaction
  };
});
