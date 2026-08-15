(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorLockTransaction = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function applyStudioEditorLockMutationWithTransaction(selection, shouldLock, options = {}) {
    const mutationApi = options.mutationApi && typeof options.mutationApi === 'object'
      ? options.mutationApi
      : null;
    const applyMutation = mutationApi
      && typeof mutationApi.applyStudioLockMutationWithTransaction === 'function'
      ? mutationApi.applyStudioLockMutationWithTransaction
      : null;
    if (!applyMutation) {
      return { didApply: false, transaction: null };
    }

    const isLocked = typeof options.isLocked === 'function'
      ? options.isLocked
      : () => false;
    const setLocked = typeof options.setLocked === 'function'
      ? options.setLocked
      : (element, nextShouldLock) => {
          if (typeof options.setElementLockedState === 'function') {
            options.setElementLockedState(element, nextShouldLock);
          }
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
    return applyMutation(selection, shouldLock, {
      lockApi: options.lockApi && typeof options.lockApi === 'object'
        ? options.lockApi
        : null,
      transactionApi: options.transactionApi && typeof options.transactionApi === 'object'
        ? options.transactionApi
        : null,
      isLocked,
      setLocked,
      getElementId
    });
  }

  function createStudioEditorLockApplicator(options = {}) {
    const applyLockTransaction = typeof options.applyLockTransaction === 'function'
      ? options.applyLockTransaction
      : applyStudioEditorLockMutationWithTransaction;
    const mutationApi = options.mutationApi && typeof options.mutationApi === 'object'
      ? options.mutationApi
      : null;
    const lockApi = options.lockApi && typeof options.lockApi === 'object'
      ? options.lockApi
      : null;
    const transactionApi = options.transactionApi && typeof options.transactionApi === 'object'
      ? options.transactionApi
      : null;
    const legacyApplyLock = typeof options.legacyApplyLock === 'function'
      ? options.legacyApplyLock
      : () => ({ didApply: false, transaction: null });
    const canApplyLockTransaction = mutationApi
      && (typeof options.applyLockTransaction === 'function'
        || typeof mutationApi.applyStudioLockMutationWithTransaction === 'function');

    return (selection, shouldLock, mutationOptions = {}) => {
      if (canApplyLockTransaction) {
        return applyLockTransaction(selection, shouldLock, {
          mutationApi,
          lockApi,
          transactionApi,
          ...mutationOptions
        });
      }
      return legacyApplyLock(selection, shouldLock, mutationOptions);
    };
  }

  return {
    applyStudioEditorLockMutationWithTransaction,
    createStudioEditorLockApplicator
  };
});
