(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorVisibilityTransaction = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function applyStudioEditorVisibilityMutationWithTransaction(selection, shouldHide, options = {}) {
    const mutationApi = options.mutationApi && typeof options.mutationApi === 'object'
      ? options.mutationApi
      : null;
    const applyMutation = mutationApi
      && typeof mutationApi.applyStudioVisibilityMutationWithTransaction === 'function'
      ? mutationApi.applyStudioVisibilityMutationWithTransaction
      : null;
    if (!applyMutation) {
      return { didApply: false, transaction: null };
    }

    const isHidden = typeof options.isHidden === 'function'
      ? options.isHidden
      : () => false;
    const setHidden = typeof options.setHidden === 'function'
      ? options.setHidden
      : (element, nextShouldHide) => {
          if (typeof options.setElementHiddenState === 'function') {
            options.setElementHiddenState(element, nextShouldHide);
          }
        };
    const getVisibilityState = typeof options.getVisibilityState === 'function'
      ? options.getVisibilityState
      : (element) => {
          const elementState = options.elementStateApi && typeof options.elementStateApi === 'object'
            ? options.elementStateApi
            : null;
          return elementState && typeof elementState.getStudioElementVisibilityState === 'function'
            ? elementState.getStudioElementVisibilityState(element)
            : null;
        };
    const getElementId = typeof options.getElementId === 'function'
      ? options.getElementId
      : (element) => {
          if (typeof options.assignEditorElementId === 'function') {
            const assignedId = options.assignEditorElementId(element);
            if (assignedId) return assignedId;
          }
          return element && element.dataset && element.dataset.editorId;
        };
    return applyMutation(selection, shouldHide, {
      visibilityApi: options.visibilityApi && typeof options.visibilityApi === 'object'
        ? options.visibilityApi
        : null,
      transactionApi: options.transactionApi && typeof options.transactionApi === 'object'
        ? options.transactionApi
        : null,
      isHidden,
      setHidden,
      getVisibilityState,
      getElementId
    });
  }

  function createStudioEditorVisibilityApplicator(options = {}) {
    const applyVisibilityTransaction = typeof options.applyVisibilityTransaction === 'function'
      ? options.applyVisibilityTransaction
      : applyStudioEditorVisibilityMutationWithTransaction;
    const mutationApi = options.mutationApi && typeof options.mutationApi === 'object'
      ? options.mutationApi
      : null;
    const visibilityApi = options.visibilityApi && typeof options.visibilityApi === 'object'
      ? options.visibilityApi
      : null;
    const transactionApi = options.transactionApi && typeof options.transactionApi === 'object'
      ? options.transactionApi
      : null;
    const legacyApplyVisibility = typeof options.legacyApplyVisibility === 'function'
      ? options.legacyApplyVisibility
      : () => ({ didApply: false, transaction: null });
    const canApplyVisibilityTransaction = mutationApi
      && (typeof options.applyVisibilityTransaction === 'function'
        || typeof mutationApi.applyStudioVisibilityMutationWithTransaction === 'function');

    return (selection, shouldHide, mutationOptions = {}) => {
      if (canApplyVisibilityTransaction) {
        return applyVisibilityTransaction(selection, shouldHide, {
          mutationApi,
          visibilityApi,
          transactionApi,
          ...mutationOptions
        });
      }
      return legacyApplyVisibility(selection, shouldHide, mutationOptions);
    };
  }

  return {
    applyStudioEditorVisibilityMutationWithTransaction,
    createStudioEditorVisibilityApplicator
  };
});
