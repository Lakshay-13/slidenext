(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorStyleTransaction = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function applyStudioEditorStyleMutationWithTransaction(styleApi, selection, prop, value, options = {}) {
    const mutationApi = options.mutationApi && typeof options.mutationApi === 'object'
      ? options.mutationApi
      : null;
    const applyMutation = mutationApi
      && typeof mutationApi.applyStudioStyleMutationWithTransaction === 'function'
      ? mutationApi.applyStudioStyleMutationWithTransaction
      : null;
    if (!applyMutation) {
      return { didApply: false, displayValue: `${value}`, transaction: null };
    }

    const getElementId = typeof options.getElementId === 'function'
      ? options.getElementId
      : (element) => {
          if (typeof options.assignElementId === 'function') {
            const assignedId = options.assignElementId(element);
            if (assignedId) return assignedId;
          }
          return element && element.dataset && element.dataset.editorId;
        };
    const resolvedStyleApi = styleApi && typeof styleApi === 'object' ? styleApi : null;
    return applyMutation(resolvedStyleApi, selection, prop, value, {
      transactionApi: options.transactionApi && typeof options.transactionApi === 'object'
        ? options.transactionApi
        : null,
      chartApi: options.chartApi && typeof options.chartApi === 'object'
        ? options.chartApi
        : null,
      getElementId,
      applyStudioStyleMutation: resolvedStyleApi
        && typeof resolvedStyleApi.applyStudioStyleMutation === 'function'
        ? resolvedStyleApi.applyStudioStyleMutation
        : null
    });
  }

  function createStudioEditorStyleApplicator(options = {}) {
    const applyStyleTransaction = typeof options.applyStyleTransaction === 'function'
      ? options.applyStyleTransaction
      : applyStudioEditorStyleMutationWithTransaction;
    const styleApi = options.styleApi && typeof options.styleApi === 'object'
      ? options.styleApi
      : null;
    const mutationApi = options.mutationApi && typeof options.mutationApi === 'object'
      ? options.mutationApi
      : null;
    const transactionApi = options.transactionApi && typeof options.transactionApi === 'object'
      ? options.transactionApi
      : null;
    const chartApi = options.chartApi && typeof options.chartApi === 'object'
      ? options.chartApi
      : null;
    const legacyApplyStyle = typeof options.legacyApplyStyle === 'function'
      ? options.legacyApplyStyle
      : () => ({ didApply: false, displayValue: '', transaction: null });
    const canApplyStyleTransaction = mutationApi
      && (typeof options.applyStyleTransaction === 'function'
        || typeof mutationApi.applyStudioStyleMutationWithTransaction === 'function');

    return (resolvedStyleApi, selection, prop, value, mutationOptions = {}) => {
      const effectiveStyleApi = resolvedStyleApi || styleApi;
      if (canApplyStyleTransaction) {
        return applyStyleTransaction(effectiveStyleApi, selection, prop, value, {
          mutationApi,
          transactionApi,
          chartApi,
          ...mutationOptions
        });
      }
      return legacyApplyStyle(effectiveStyleApi, selection, prop, value, mutationOptions);
    };
  }

  return {
    applyStudioEditorStyleMutationWithTransaction,
    createStudioEditorStyleApplicator
  };
});
