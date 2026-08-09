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
    let pendingCanonicalDeck = Object.prototype.hasOwnProperty.call(options, 'initialPendingCanonicalDeck')
      ? options.initialPendingCanonicalDeck
      : null;

    function setPendingTransaction(nextTransaction) {
      pendingTransaction = nextTransaction;
      return pendingTransaction;
    }

    function setPendingCanonicalDeck(nextCanonicalDeck) {
      pendingCanonicalDeck = nextCanonicalDeck;
      return pendingCanonicalDeck;
    }

    function clear() {
      pendingTransaction = null;
      pendingCanonicalDeck = null;
      return pendingTransaction;
    }

    return {
      getPendingTransaction: () => pendingTransaction,
      setPendingTransaction,
      getPendingCanonicalDeck: () => pendingCanonicalDeck,
      setPendingCanonicalDeck,
      clear
    };
  }

  return { createStudioEditorHistoryPendingController };
});
