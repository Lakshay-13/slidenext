(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorMutation = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function createStudioMutationFinalizer(options = {}) {
    const syncSelectionOverlay = typeof options.syncSelectionOverlay === 'function'
      ? options.syncSelectionOverlay
      : () => {};
    const generateThumbnails = typeof options.generateThumbnails === 'function'
      ? options.generateThumbnails
      : () => {};
    const updateLayersList = typeof options.updateLayersList === 'function'
      ? options.updateLayersList
      : () => {};
    const saveHistoryState = typeof options.saveHistoryState === 'function'
      ? options.saveHistoryState
      : () => {};
    const triggerAutoSave = typeof options.triggerAutoSave === 'function'
      ? options.triggerAutoSave
      : () => {};
    const triggerAutoVersion = typeof options.triggerAutoVersion === 'function'
      ? options.triggerAutoVersion
      : () => {};

    return function finalizeStudioMutation(versionLabel, mutationOptions = {}) {
      if (mutationOptions.syncSelectionOverlay) {
        syncSelectionOverlay();
      }
      if (mutationOptions.refreshThumbnails !== false) {
        generateThumbnails();
      }
      if (mutationOptions.refreshLayersList) {
        updateLayersList();
      }
      saveHistoryState(
        mutationOptions.debounceHistory === true,
        mutationOptions.transaction || null
      );
      triggerAutoSave();
      if (versionLabel) {
        triggerAutoVersion(versionLabel);
      }
      return versionLabel;
    };
  }

  function finalizeStudioMutation(options = {}) {
    const mutationFinalizer = createStudioMutationFinalizer(options);
    return mutationFinalizer(options.versionLabel, options.mutationOptions || {});
  }

  function finalizeStudioSelectionToggleMutation(options = {}) {
    const mutationOptions = options.mutationOptions || {};
    if (!mutationOptions.skipSelectionUi && typeof options.syncSelectionUi === 'function') {
      options.syncSelectionUi();
    }
    const finalizeMutation = options.finalizeMutation;
    if (typeof finalizeMutation !== 'function') return false;
    finalizeMutation(options.versionLabel, {
      refreshThumbnails: false,
      ...(mutationOptions.transaction ? { transaction: mutationOptions.transaction } : {})
    });
    return true;
  }

  function finalizeStudioSlideMutation(options = {}) {
    const finalizeSlideMutation = createStudioSlideMutationPersistenceFinalizer(options);
    const transaction = Object.prototype.hasOwnProperty.call(options, 'transaction')
      ? options.transaction
      : null;
    const canonicalDeck = Object.prototype.hasOwnProperty.call(options, 'canonicalDeck')
      ? options.canonicalDeck
      : null;
    return finalizeSlideMutation(options.versionLabel, transaction, canonicalDeck);
  }

  function createStudioSlideMutationPersistenceFinalizer(options = {}) {
    const saveHistoryState = typeof options.saveHistoryState === 'function'
      ? options.saveHistoryState
      : () => {};
    const triggerAutoSave = typeof options.triggerAutoSave === 'function'
      ? options.triggerAutoSave
      : () => {};
    const triggerAutoVersion = typeof options.triggerAutoVersion === 'function'
      ? options.triggerAutoVersion
      : () => {};

    return function finalizeStudioSlideMutation(versionLabel, transaction = null, canonicalDeck = null) {
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
    createStudioMutationFinalizer,
    finalizeStudioMutation,
    finalizeStudioSelectionToggleMutation,
    finalizeStudioSlideMutation,
    createStudioSlideMutationPersistenceFinalizer
  };
});
