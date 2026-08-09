(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorHistoryPendingController = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function createStudioEditorHistoryPendingController(options = {}) {
    let pendingTransaction = Object.prototype.hasOwnProperty.call(options, 'initialPendingTransaction')
      ? options.initialPendingTransaction
      : null;

    function setPendingTransaction(nextTransaction) {
      pendingTransaction = nextTransaction;
      return pendingTransaction;
    }

    function clear() {
      pendingTransaction = null;
      return pendingTransaction;
    }

    return {
      getPendingTransaction: () => pendingTransaction,
      setPendingTransaction,
      clear
    };
  }

  return { createStudioEditorHistoryPendingController };
});
