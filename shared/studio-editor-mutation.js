(function (root, factory) {
  const historyResultApi = typeof module === 'object' && module.exports
    ? require('./studio-editor-history-result.js')
    : root && root.SlideNextStudioEditorHistoryResult;
  const api = factory(historyResultApi);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorMutation = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (historyResultApi) {
  function isStudioCanonicalDeckLike(value) {
    return !!value
      && typeof value === 'object'
      && !Array.isArray(value)
      && Array.isArray(value.slides);
  }

  function isValidStudioCanonicalDeck(value, validator) {
    if (!value) return false;
    const validate = typeof validator === 'function'
      ? validator
      : isStudioCanonicalDeckLike;
    try {
      return validate(value) === true;
    } catch (err) {
      return false;
    }
  }

  const isStudioHistoryCaptureFailure = historyResultApi
    && typeof historyResultApi.isStudioHistoryCaptureFailure === 'function'
    ? historyResultApi.isStudioHistoryCaptureFailure
    : (value) => value === false
      || (!!value && typeof value === 'object' && value.didCapture === false);
  const captureStudioHistoryState = historyResultApi
    && typeof historyResultApi.captureStudioHistoryState === 'function'
    ? historyResultApi.captureStudioHistoryState
    : (saveHistoryState, ...args) => {
        if (typeof saveHistoryState !== 'function') return false;
        try {
          return saveHistoryState(...args);
        } catch (error) {
          return false;
        }
      };

  function invokeStudioEditorMutationFinalizer(finalizeMutation, ...args) {
    try {
      return finalizeMutation(...args);
    } catch (err) {
      return false;
    }
  }

  function invokeStudioEditorThumbnailRefresh(generateThumbnails) {
    if (typeof generateThumbnails !== 'function') return;
    try {
      generateThumbnails();
    } catch (err) {
      // Thumbnail refresh is secondary to the committed mutation.
    }
  }

  function invokeStudioEditorUiRefresh(refreshUi, ...args) {
    if (typeof refreshUi !== 'function') return;
    try {
      refreshUi(...args);
    } catch (err) {
      // Editor chrome refresh is secondary to the committed mutation.
    }
  }

  function invokeStudioEditorAutoSave(triggerAutoSave) {
    if (typeof triggerAutoSave !== 'function') return true;
    try {
      return triggerAutoSave() !== false;
    } catch (err) {
      return false;
    }
  }

  function invokeStudioEditorAutoVersion(triggerAutoVersion, versionLabel) {
    if (typeof triggerAutoVersion !== 'function' || !versionLabel) return;
    try {
      triggerAutoVersion(versionLabel);
    } catch (err) {
      // Version notification is secondary to the committed mutation.
    }
  }

  function resolveStudioMutationOptions(mutationOptions = {}, options = {}) {
    const sourceOptions = mutationOptions && typeof mutationOptions === 'object'
      ? mutationOptions
      : {};
    const isCanonicalDeck = options.isCanonicalDeck;
    const buildCanonicalDeckBaseline = typeof options.buildCanonicalDeckBaseline === 'function'
      ? options.buildCanonicalDeckBaseline
      : typeof options.buildCanonicalDeck === 'function'
        ? options.buildCanonicalDeck
        : null;
    const resolveCanonicalDeckBaseline = () => {
      if (!buildCanonicalDeckBaseline) return null;
      try {
        const canonicalDeck = buildCanonicalDeckBaseline(undefined, {
          preferLiveCanonicalDeck: false
        });
        return isValidStudioCanonicalDeck(canonicalDeck, isCanonicalDeck)
          ? canonicalDeck
          : null;
      } catch (err) {
        return null;
      }
    };
    const hasCanonicalDeck = Object.prototype.hasOwnProperty.call(sourceOptions, 'canonicalDeck');
    if (hasCanonicalDeck) {
      if (isValidStudioCanonicalDeck(sourceOptions.canonicalDeck, isCanonicalDeck)) {
        return sourceOptions;
      }
      const { canonicalDeck, ...optionsWithoutCanonicalDeck } = sourceOptions;
      const rebuiltCanonicalDeck = resolveCanonicalDeckBaseline();
      return rebuiltCanonicalDeck
        ? { ...optionsWithoutCanonicalDeck, canonicalDeck: rebuiltCanonicalDeck }
        : optionsWithoutCanonicalDeck;
    }

    const rebuiltCanonicalDeck = resolveCanonicalDeckBaseline();
    return rebuiltCanonicalDeck
      ? { ...sourceOptions, canonicalDeck: rebuiltCanonicalDeck }
      : sourceOptions;
  }

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
    const buildCanonicalDeck = typeof options.buildCanonicalDeck === 'function'
      ? options.buildCanonicalDeck
      : null;
    const buildCanonicalDeckBaseline = typeof options.buildCanonicalDeckBaseline === 'function'
      ? options.buildCanonicalDeckBaseline
      : buildCanonicalDeck;
    const isCanonicalDeck = typeof options.isCanonicalDeck === 'function'
      ? options.isCanonicalDeck
      : null;

    return function finalizeStudioMutation(versionLabel, mutationOptions = {}) {
      const resolvedMutationOptions = resolveStudioMutationOptions(mutationOptions, {
        buildCanonicalDeckBaseline,
        isCanonicalDeck
      });
      const hasCanonicalDeck = Object.prototype.hasOwnProperty.call(
        resolvedMutationOptions,
        'canonicalDeck'
      );
      const shouldPublishCanonicalDeckBeforeUi = hasCanonicalDeck
        && !!resolvedMutationOptions.canonicalDeck;
      const historyArgs = [
        resolvedMutationOptions.debounceHistory === true,
        resolvedMutationOptions.transaction || null
      ];
      if (hasCanonicalDeck) {
        historyArgs.push(resolvedMutationOptions.canonicalDeck);
      }
      if (shouldPublishCanonicalDeckBeforeUi) {
        if (isStudioHistoryCaptureFailure(captureStudioHistoryState(saveHistoryState, ...historyArgs))) {
          return false;
        }
      }
      if (resolvedMutationOptions.syncSelectionOverlay) {
        invokeStudioEditorUiRefresh(syncSelectionOverlay, resolvedMutationOptions.doc);
      }
      if (resolvedMutationOptions.refreshThumbnails !== false) {
        invokeStudioEditorThumbnailRefresh(generateThumbnails);
      }
      if (resolvedMutationOptions.refreshLayersList) {
        invokeStudioEditorUiRefresh(updateLayersList, resolvedMutationOptions.doc);
      }
      if (!shouldPublishCanonicalDeckBeforeUi) {
        if (isStudioHistoryCaptureFailure(captureStudioHistoryState(saveHistoryState, ...historyArgs))) {
          return false;
        }
      }
      if (!invokeStudioEditorAutoSave(triggerAutoSave)) return false;
      invokeStudioEditorAutoVersion(triggerAutoVersion, versionLabel);
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
      options.syncSelectionUi(mutationOptions.doc);
    }
    const finalizeMutation = options.finalizeMutation;
    if (typeof finalizeMutation !== 'function') return false;
    const finalizeResult = invokeStudioEditorMutationFinalizer(finalizeMutation, options.versionLabel, {
      refreshThumbnails: false,
      ...(mutationOptions.transaction ? { transaction: mutationOptions.transaction } : {}),
      ...(mutationOptions.canonicalDeck ? { canonicalDeck: mutationOptions.canonicalDeck } : {})
    });
    return finalizeResult === false ? false : true;
  }

  function finalizeStudioInsertedElements(options = {}) {
    const insertedElements = options.insertedElements;
    if (!insertedElements || insertedElements.length === 0) return false;
    const selectAllElements = typeof options.selectAllElements === 'function'
      ? options.selectAllElements
      : () => ({ selectedElements: insertedElements, selectedElement: insertedElements[0] || null });
    const commitSelectionState = typeof options.commitSelectionState === 'function'
      ? options.commitSelectionState
      : () => {};
    const finalizeMutation = typeof options.finalizeMutation === 'function'
      ? options.finalizeMutation
      : null;
    if (!finalizeMutation) return false;

    const nextSelectionState = selectAllElements(insertedElements);
    commitSelectionState(nextSelectionState);
    const finalizeResult = invokeStudioEditorMutationFinalizer(finalizeMutation, options.versionLabel, {
      transaction: options.transaction,
      ...(options.canonicalDeck ? { canonicalDeck: options.canonicalDeck } : {})
    });
    return finalizeResult === false ? false : true;
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
    const isCanonicalDeck = typeof options.isCanonicalDeck === 'function'
      ? options.isCanonicalDeck
      : null;

    return function finalizeStudioSlideMutation(versionLabel, transaction = null, canonicalDeck = null) {
      const validCanonicalDeck = isValidStudioCanonicalDeck(canonicalDeck, isCanonicalDeck)
        ? canonicalDeck
        : null;
      if (validCanonicalDeck) {
        if (isStudioHistoryCaptureFailure(
          captureStudioHistoryState(saveHistoryState, false, transaction, validCanonicalDeck)
        )) return false;
      } else {
        if (isStudioHistoryCaptureFailure(
          captureStudioHistoryState(saveHistoryState, false, transaction)
        )) return false;
      }
      if (!invokeStudioEditorAutoSave(triggerAutoSave)) return false;
      invokeStudioEditorAutoVersion(triggerAutoVersion, versionLabel);
      return versionLabel;
    };
  }

  function createStudioSlideMutationRestoreStateCapturer(options = {}) {
    const captureStudioDeckViewBeforeSlideMutation = typeof options.captureStudioDeckViewBeforeSlideMutation === 'function'
      ? options.captureStudioDeckViewBeforeSlideMutation
      : null;
    const saveHistoryState = typeof options.saveHistoryState === 'function'
      ? options.saveHistoryState
      : () => {};
    const getActiveSlideId = typeof options.getActiveSlideId === 'function'
      ? options.getActiveSlideId
      : () => '';
    const getCommittedSelectedElementIds = typeof options.getCommittedSelectedElementIds === 'function'
      ? options.getCommittedSelectedElementIds
      : () => [];
    const buildCanonicalDeck = typeof options.buildCanonicalDeck === 'function'
      ? options.buildCanonicalDeck
      : null;
    const isCanonicalDeck = typeof options.isCanonicalDeck === 'function'
      ? options.isCanonicalDeck
      : null;

    const captureHistoryBaseline = buildCanonicalDeck
      ? (iframeDoc) => {
          let canonicalDeck = null;
          try {
            canonicalDeck = buildCanonicalDeck(iframeDoc, {
              preferLiveCanonicalDeck: false
            });
          } catch (err) {
            canonicalDeck = null;
          }
          if (isValidStudioCanonicalDeck(canonicalDeck, isCanonicalDeck)) {
            return captureStudioHistoryState(saveHistoryState, false, null, canonicalDeck);
          } else {
            return captureStudioHistoryState(saveHistoryState);
          }
        }
      : (...args) => captureStudioHistoryState(saveHistoryState, ...args);

    if (captureStudioDeckViewBeforeSlideMutation) {
      return (iframeDoc) => captureStudioDeckViewBeforeSlideMutation({
        doc: iframeDoc,
        saveHistoryState: buildCanonicalDeck
          ? () => captureHistoryBaseline(iframeDoc)
          : captureHistoryBaseline,
        getActiveSlideId,
        getCommittedSelectedElementIds
      });
    }

    return (iframeDoc) => {
      const historyCaptureResult = captureHistoryBaseline(iframeDoc);
      return {
        ...(isStudioHistoryCaptureFailure(historyCaptureResult) ? { historyCaptureFailed: true } : {}),
        preservedActiveSlideId: getActiveSlideId(iframeDoc),
        preservedSelectionIds: getCommittedSelectedElementIds(iframeDoc)
      };
    };
  }

  function finalizeStudioLayerOrderMutation(options = {}) {
    const versionLabel = options.versionLabel || '';
    const transaction = options.transaction || null;
    const hasCanonicalDeck = Object.prototype.hasOwnProperty.call(options, 'canonicalDeck');
    const isCanonicalDeck = typeof options.isCanonicalDeck === 'function'
      ? options.isCanonicalDeck
      : null;
    const hasValidCanonicalDeck = hasCanonicalDeck
      && isValidStudioCanonicalDeck(options.canonicalDeck, isCanonicalDeck);
    const finalizeMutation = options.finalizeMutation;
    if (typeof finalizeMutation === 'function') {
      const result = invokeStudioEditorMutationFinalizer(finalizeMutation, versionLabel, {
        refreshThumbnails: false,
        refreshLayersList: true,
        transaction,
        ...(hasValidCanonicalDeck ? { canonicalDeck: options.canonicalDeck } : {})
      });
      if (typeof options.updateLayerOrderActionState === 'function') {
        invokeStudioEditorUiRefresh(options.updateLayerOrderActionState);
      }
      return result;
    }

    if (typeof options.saveHistoryState === 'function') {
      if (hasValidCanonicalDeck) {
        if (isStudioHistoryCaptureFailure(
          captureStudioHistoryState(
            options.saveHistoryState,
            false,
            transaction,
            options.canonicalDeck
          )
        )) return false;
      } else {
        if (isStudioHistoryCaptureFailure(
          captureStudioHistoryState(options.saveHistoryState, false, transaction)
        )) return false;
      }
    }
    if (typeof options.triggerAutoSave === 'function') {
      if (!invokeStudioEditorAutoSave(options.triggerAutoSave)) return false;
    }
    if (typeof options.updateLayersList === 'function') {
      invokeStudioEditorUiRefresh(options.updateLayersList);
    }
    if (typeof options.updateLayerOrderActionState === 'function') {
      invokeStudioEditorUiRefresh(options.updateLayerOrderActionState);
    }
    invokeStudioEditorAutoVersion(options.triggerAutoVersion, versionLabel);
    return versionLabel;
  }

  function finalizeStudioWallpaperMutation(options = {}) {
    const versionLabel = options.versionLabel || '';
    const transaction = options.transaction || null;
    const isCanonicalDeck = typeof options.isCanonicalDeck === 'function'
      ? options.isCanonicalDeck
      : null;
    const canonicalDeck = isValidStudioCanonicalDeck(options.canonicalDeck, isCanonicalDeck)
      ? options.canonicalDeck
      : null;
    if (typeof options.finalizeMutation === 'function') {
      return invokeStudioEditorMutationFinalizer(options.finalizeMutation, versionLabel, {
        transaction,
        ...(canonicalDeck ? { canonicalDeck } : {})
      });
    }
    if (typeof options.generateThumbnails === 'function') {
      invokeStudioEditorThumbnailRefresh(options.generateThumbnails);
    }
    if (typeof options.saveHistoryState === 'function') {
      if (canonicalDeck) {
        if (isStudioHistoryCaptureFailure(
          captureStudioHistoryState(options.saveHistoryState, false, transaction, canonicalDeck)
        )) return false;
      } else {
        if (isStudioHistoryCaptureFailure(
          captureStudioHistoryState(options.saveHistoryState, false, transaction)
        )) return false;
      }
    }
    if (typeof options.triggerAutoSave === 'function') {
      if (!invokeStudioEditorAutoSave(options.triggerAutoSave)) return false;
    }
    invokeStudioEditorAutoVersion(options.triggerAutoVersion, versionLabel);
    return versionLabel;
  }

  return {
    resolveStudioMutationOptions,
    createStudioMutationFinalizer,
    finalizeStudioMutation,
    finalizeStudioSelectionToggleMutation,
    finalizeStudioInsertedElements,
    finalizeStudioSlideMutation,
    createStudioSlideMutationPersistenceFinalizer,
    createStudioSlideMutationRestoreStateCapturer,
    finalizeStudioLayerOrderMutation,
    finalizeStudioWallpaperMutation
  };
});
