(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorDeckMutation = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function finalizeStudioEditorDeckMutation(versionLabel, mutationOptions = {}, options = {}) {
    const mutationApi = options.mutationApi && typeof options.mutationApi === 'object'
      ? options.mutationApi
      : null;
    const buildCanonicalDeck = typeof options.buildCanonicalDeck === 'function'
      ? options.buildCanonicalDeck
      : null;
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
    if (mutationApi && typeof mutationApi.finalizeStudioMutation === 'function') {
      return mutationApi.finalizeStudioMutation({
        versionLabel,
        mutationOptions,
        ...(buildCanonicalDeck ? { buildCanonicalDeck } : {}),
        syncSelectionOverlay,
        generateThumbnails,
        updateLayersList,
        saveHistoryState,
        triggerAutoSave,
        triggerAutoVersion
      });
    }

    const resolvedMutationOptions = Object.prototype.hasOwnProperty.call(mutationOptions, 'canonicalDeck')
      || !buildCanonicalDeck
      ? mutationOptions
      : (() => {
          const canonicalDeck = buildCanonicalDeck(undefined);
          return canonicalDeck
            ? { ...mutationOptions, canonicalDeck }
            : mutationOptions;
        })();
    if (resolvedMutationOptions.syncSelectionOverlay) {
      syncSelectionOverlay();
    }
    if (resolvedMutationOptions.refreshThumbnails !== false) {
      generateThumbnails();
    }
    if (resolvedMutationOptions.refreshLayersList) {
      updateLayersList();
    }
    const historyArgs = [
      resolvedMutationOptions.debounceHistory === true,
      resolvedMutationOptions.transaction || null
    ];
    if (Object.prototype.hasOwnProperty.call(resolvedMutationOptions, 'canonicalDeck')) {
      historyArgs.push(resolvedMutationOptions.canonicalDeck);
    }
    saveHistoryState(...historyArgs);
    triggerAutoSave();
    if (versionLabel) {
      triggerAutoVersion(versionLabel);
    }
    return versionLabel;
  }

  function finalizeStudioEditorSelectionToggleMutation(versionLabel, mutationOptions = {}, options = {}) {
    const mutationApi = options.mutationApi && typeof options.mutationApi === 'object'
      ? options.mutationApi
      : null;
    const syncSelectionUi = typeof options.syncSelectionUi === 'function'
      ? options.syncSelectionUi
      : () => {};
    const finalizeMutation = typeof options.finalizeMutation === 'function'
      ? options.finalizeMutation
      : null;
    if (mutationApi && typeof mutationApi.finalizeStudioSelectionToggleMutation === 'function') {
      return mutationApi.finalizeStudioSelectionToggleMutation({
        versionLabel,
        mutationOptions,
        syncSelectionUi,
        finalizeMutation
      });
    }
    if (!mutationOptions.skipSelectionUi) {
      syncSelectionUi();
    }
    if (!finalizeMutation) return false;
    finalizeMutation(versionLabel, {
      refreshThumbnails: false,
      ...(mutationOptions.transaction ? { transaction: mutationOptions.transaction } : {}),
      ...(mutationOptions.canonicalDeck ? { canonicalDeck: mutationOptions.canonicalDeck } : {})
    });
    return true;
  }

  return {
    finalizeStudioEditorDeckMutation,
    finalizeStudioEditorSelectionToggleMutation
  };
});
