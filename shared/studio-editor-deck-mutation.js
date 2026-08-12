(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorDeckMutation = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function createStudioEditorDeckMutationFinalizer(options = {}) {
    const mutationApi = options.mutationApi && typeof options.mutationApi === 'object'
      ? options.mutationApi
      : null;
    const buildCanonicalDeck = typeof options.buildCanonicalDeck === 'function'
      ? options.buildCanonicalDeck
      : null;
    const buildCanonicalDeckBaseline = typeof options.buildCanonicalDeckBaseline === 'function'
      ? options.buildCanonicalDeckBaseline
      : buildCanonicalDeck;
    const isCanonicalDeck = typeof options.isCanonicalDeck === 'function'
      ? options.isCanonicalDeck
      : null;
    const syncSelectionOverlay = typeof options.syncSelectionOverlay === 'function'
      ? options.syncSelectionOverlay
      : null;
    const generateThumbnails = typeof options.generateThumbnails === 'function'
      ? options.generateThumbnails
      : null;
    const updateLayersList = typeof options.updateLayersList === 'function'
      ? options.updateLayersList
      : null;
    const saveHistoryState = typeof options.saveHistoryState === 'function'
      ? options.saveHistoryState
      : null;
    const triggerAutoSave = typeof options.triggerAutoSave === 'function'
      ? options.triggerAutoSave
      : null;
    const triggerAutoVersion = typeof options.triggerAutoVersion === 'function'
      ? options.triggerAutoVersion
      : null;

    return function finalizeConfiguredStudioEditorDeckMutation(versionLabel, mutationOptions = {}) {
      return finalizeStudioEditorDeckMutation(versionLabel, mutationOptions, {
        mutationApi,
        buildCanonicalDeckBaseline,
        isCanonicalDeck,
        syncSelectionOverlay,
        generateThumbnails,
        updateLayersList,
        saveHistoryState,
        triggerAutoSave,
        triggerAutoVersion
      });
    };
  }

  function finalizeStudioEditorDeckMutation(versionLabel, mutationOptions = {}, options = {}) {
    const mutationApi = options.mutationApi && typeof options.mutationApi === 'object'
      ? options.mutationApi
      : null;
    const buildCanonicalDeck = typeof options.buildCanonicalDeck === 'function'
      ? options.buildCanonicalDeck
      : null;
    const buildCanonicalDeckBaseline = typeof options.buildCanonicalDeckBaseline === 'function'
      ? options.buildCanonicalDeckBaseline
      : buildCanonicalDeck;
    const isCanonicalDeck = typeof options.isCanonicalDeck === 'function'
      ? options.isCanonicalDeck
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
        ...(buildCanonicalDeckBaseline ? { buildCanonicalDeck: buildCanonicalDeckBaseline } : {}),
        ...(isCanonicalDeck ? { isCanonicalDeck } : {}),
        syncSelectionOverlay,
        generateThumbnails,
        updateLayersList,
        saveHistoryState,
        triggerAutoSave,
        triggerAutoVersion
      });
    }

    const resolvedMutationOptions = Object.prototype.hasOwnProperty.call(mutationOptions, 'canonicalDeck')
      || !buildCanonicalDeckBaseline
      ? mutationOptions
      : (() => {
          const canonicalDeck = buildCanonicalDeckBaseline(undefined);
          return canonicalDeck
            ? { ...mutationOptions, canonicalDeck }
            : mutationOptions;
    })();
    if (resolvedMutationOptions.syncSelectionOverlay) {
      syncSelectionOverlay(resolvedMutationOptions.doc);
    }
    if (resolvedMutationOptions.refreshThumbnails !== false) {
      generateThumbnails();
    }
    if (resolvedMutationOptions.refreshLayersList) {
      updateLayersList(resolvedMutationOptions.doc);
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
      syncSelectionUi(mutationOptions.doc);
    }
    if (!finalizeMutation) return false;
    finalizeMutation(versionLabel, {
      refreshThumbnails: false,
      ...(mutationOptions.transaction ? { transaction: mutationOptions.transaction } : {}),
      ...(mutationOptions.canonicalDeck ? { canonicalDeck: mutationOptions.canonicalDeck } : {})
    });
    return true;
  }

  function finalizeStudioEditorInsertedElements(
    insertedElements,
    versionLabel,
    transaction = null,
    canonicalDeck = null,
    options = {}
  ) {
    const selectionApi = options.selectionApi && typeof options.selectionApi === 'object'
      ? options.selectionApi
      : null;
    if (!selectionApi || typeof selectionApi.selectAllStudioElements !== 'function') return false;
    const mutationApi = options.mutationApi && typeof options.mutationApi === 'object'
      ? options.mutationApi
      : null;
    const finalizeMutation = typeof options.finalizeMutation === 'function'
      ? options.finalizeMutation
      : null;
    if (mutationApi && typeof mutationApi.finalizeStudioInsertedElements === 'function') {
      return mutationApi.finalizeStudioInsertedElements({
        insertedElements,
        versionLabel,
        transaction,
        ...(canonicalDeck ? { canonicalDeck } : {}),
        selectAllElements: selectionApi.selectAllStudioElements,
        commitSelectionState: options.commitSelectionState,
        finalizeMutation
      });
    }
    if (!insertedElements || insertedElements.length === 0 || !finalizeMutation) return false;
    const nextSelectionState = selectionApi.selectAllStudioElements(insertedElements);
    if (typeof options.commitSelectionState === 'function') {
      options.commitSelectionState(nextSelectionState);
    }
    finalizeMutation(versionLabel, {
      transaction,
      ...(canonicalDeck ? { canonicalDeck } : {})
    });
    return true;
  }

  function finalizeStudioEditorLayerOrderMutation(
    versionLabel = 'Auto: Rearranged Layers',
    mutationOptions = {},
    options = {}
  ) {
    const resolvedMutationOptions = mutationOptions && typeof mutationOptions === 'object'
      ? mutationOptions
      : {};
    const mutationApi = options.mutationApi && typeof options.mutationApi === 'object'
      ? options.mutationApi
      : null;
    const transaction = resolvedMutationOptions.transaction || null;
    const canonicalDeck = resolvedMutationOptions.canonicalDeck || null;
    const finalizeMutation = typeof options.finalizeMutation === 'function'
      ? options.finalizeMutation
      : null;
    if (mutationApi && typeof mutationApi.finalizeStudioLayerOrderMutation === 'function') {
      return mutationApi.finalizeStudioLayerOrderMutation({
        versionLabel,
        transaction,
        ...(canonicalDeck ? { canonicalDeck } : {}),
        finalizeMutation,
        saveHistoryState: options.saveHistoryState,
        triggerAutoSave: options.triggerAutoSave,
        updateLayersList: options.updateLayersList,
        updateLayerOrderActionState: options.updateLayerOrderActionState,
        triggerAutoVersion: options.triggerAutoVersion
      });
    }
    if (finalizeMutation) {
      const result = finalizeMutation(versionLabel, {
        refreshThumbnails: false,
        refreshLayersList: true,
        transaction,
        ...(canonicalDeck ? { canonicalDeck } : {})
      });
      if (typeof options.updateLayerOrderActionState === 'function') {
        options.updateLayerOrderActionState();
      }
      return result;
    }
    if (typeof options.saveHistoryState === 'function') {
      if (canonicalDeck) {
        options.saveHistoryState(false, transaction, canonicalDeck);
      } else {
        options.saveHistoryState(false, transaction);
      }
    }
    if (typeof options.triggerAutoSave === 'function') {
      options.triggerAutoSave();
    }
    if (typeof options.updateLayersList === 'function') {
      options.updateLayersList();
    }
    if (typeof options.updateLayerOrderActionState === 'function') {
      options.updateLayerOrderActionState();
    }
    if (versionLabel && typeof options.triggerAutoVersion === 'function') {
      options.triggerAutoVersion(versionLabel);
    }
    return versionLabel;
  }

  function finalizeStudioEditorWallpaperMutation(
    versionLabel = '',
    transaction = null,
    canonicalDeck = null,
    options = {}
  ) {
    const mutationApi = options.mutationApi && typeof options.mutationApi === 'object'
      ? options.mutationApi
      : null;
    if (mutationApi && typeof mutationApi.finalizeStudioWallpaperMutation === 'function') {
      return mutationApi.finalizeStudioWallpaperMutation({
        versionLabel,
        transaction,
        ...(canonicalDeck ? { canonicalDeck } : {}),
        finalizeMutation: options.finalizeMutation,
        generateThumbnails: options.generateThumbnails,
        saveHistoryState: options.saveHistoryState,
        triggerAutoSave: options.triggerAutoSave,
        triggerAutoVersion: options.triggerAutoVersion
      });
    }
    if (typeof options.finalizeMutation === 'function') {
      return options.finalizeMutation(versionLabel, {
        transaction,
        ...(canonicalDeck ? { canonicalDeck } : {})
      });
    }
    if (typeof options.generateThumbnails === 'function') {
      options.generateThumbnails();
    }
    if (typeof options.saveHistoryState === 'function') {
      if (canonicalDeck) {
        options.saveHistoryState(false, transaction, canonicalDeck);
      } else {
        options.saveHistoryState(false, transaction);
      }
    }
    if (typeof options.triggerAutoSave === 'function') {
      options.triggerAutoSave();
    }
    if (versionLabel && typeof options.triggerAutoVersion === 'function') {
      options.triggerAutoVersion(versionLabel);
    }
    return versionLabel;
  }

  return {
    createStudioEditorDeckMutationFinalizer,
    finalizeStudioEditorDeckMutation,
    finalizeStudioEditorSelectionToggleMutation,
    finalizeStudioEditorInsertedElements,
    finalizeStudioEditorLayerOrderMutation,
    finalizeStudioEditorWallpaperMutation
  };
});
