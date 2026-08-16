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
    const chartApi = options.chartApi && typeof options.chartApi === 'object'
      ? options.chartApi
      : null;
    const applyStudioChartValuesMutationWithTransaction = chartApi
      && typeof chartApi.applyStudioChartValuesMutationWithTransaction === 'function'
      ? chartApi.applyStudioChartValuesMutationWithTransaction
      : null;
    const applyStudioChartTitleMutationWithTransaction = chartApi
      && typeof chartApi.applyStudioChartTitleMutationWithTransaction === 'function'
      ? chartApi.applyStudioChartTitleMutationWithTransaction
      : null;
    const applyStudioChartDirectionMutationWithTransaction = chartApi
      && typeof chartApi.applyStudioChartDirectionMutationWithTransaction === 'function'
      ? chartApi.applyStudioChartDirectionMutationWithTransaction
      : null;
    if (!applyStudioStyleMutationWithTransaction
      && !((prop === 'chartValues' && applyStudioChartValuesMutationWithTransaction)
        || (prop === 'chartTitle' && applyStudioChartTitleMutationWithTransaction)
        || (prop === 'chartDirection' && applyStudioChartDirectionMutationWithTransaction))) {
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
    const chartMutation = prop === 'chartValues'
      ? applyStudioChartValuesMutationWithTransaction
      : prop === 'chartTitle'
        ? applyStudioChartTitleMutationWithTransaction
        : prop === 'chartDirection'
          ? applyStudioChartDirectionMutationWithTransaction
        : null;
    if (chartMutation) {
      return chartMutation(selection, value, {
        transactionApi,
        getElementId
      });
    }
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
