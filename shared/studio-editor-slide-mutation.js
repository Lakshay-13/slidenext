(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorSlideMutation = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function createStudioEditorSlideMutationPersistenceFinalizer(options = {}) {
    const mutationApi = options.mutationApi && typeof options.mutationApi === 'object'
      ? options.mutationApi
      : null;
    const saveHistoryState = typeof options.saveHistoryState === 'function'
      ? options.saveHistoryState
      : () => {};
    const triggerAutoSave = typeof options.triggerAutoSave === 'function'
      ? options.triggerAutoSave
      : () => {};
    const triggerAutoVersion = typeof options.triggerAutoVersion === 'function'
      ? options.triggerAutoVersion
      : () => {};

    if (mutationApi && typeof mutationApi.finalizeStudioSlideMutation === 'function') {
      return (versionLabel, transaction = null, canonicalDeck = null) => (
        mutationApi.finalizeStudioSlideMutation({
          versionLabel,
          transaction,
          canonicalDeck,
          saveHistoryState,
          triggerAutoSave,
          triggerAutoVersion
        })
      );
    }

    return (versionLabel, transaction = null, canonicalDeck = null) => {
      if (canonicalDeck) {
        saveHistoryState(false, transaction, canonicalDeck);
      } else {
        saveHistoryState(false, transaction);
      }
      triggerAutoSave();
      if (versionLabel) {
        triggerAutoVersion(versionLabel);
      }
      return versionLabel;
    };
  }

  return {
    createStudioEditorSlideMutationPersistenceFinalizer
  };
});
