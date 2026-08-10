(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorMutation = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
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

  function resolveStudioMutationOptions(mutationOptions = {}, options = {}) {
    const sourceOptions = mutationOptions && typeof mutationOptions === 'object'
      ? mutationOptions
      : {};
    const isCanonicalDeck = options.isCanonicalDeck;
    const hasCanonicalDeck = Object.prototype.hasOwnProperty.call(sourceOptions, 'canonicalDeck');
    if (hasCanonicalDeck) {
      if (isValidStudioCanonicalDeck(sourceOptions.canonicalDeck, isCanonicalDeck)) {
        return sourceOptions;
      }
      const { canonicalDeck, ...optionsWithoutCanonicalDeck } = sourceOptions;
      return optionsWithoutCanonicalDeck;
    }
    const buildCanonicalDeckBaseline = typeof options.buildCanonicalDeckBaseline === 'function'
      ? options.buildCanonicalDeckBaseline
      : typeof options.buildCanonicalDeck === 'function'
        ? options.buildCanonicalDeck
        : null;
    if (!buildCanonicalDeckBaseline) {
      return sourceOptions;
    }

    let canonicalDeck = null;
    try {
      canonicalDeck = buildCanonicalDeckBaseline();
    } catch (err) {
      // Do not interrupt mutation persistence when a legacy deck cannot import.
      canonicalDeck = null;
    }
    return isValidStudioCanonicalDeck(canonicalDeck, isCanonicalDeck)
      ? { ...sourceOptions, canonicalDeck }
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
        saveHistoryState(...historyArgs);
      }
      if (resolvedMutationOptions.syncSelectionOverlay) {
        syncSelectionOverlay();
      }
      if (resolvedMutationOptions.refreshThumbnails !== false) {
        generateThumbnails();
      }
      if (resolvedMutationOptions.refreshLayersList) {
        updateLayersList();
      }
      if (!shouldPublishCanonicalDeckBeforeUi) {
        saveHistoryState(...historyArgs);
      }
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
      ...(mutationOptions.transaction ? { transaction: mutationOptions.transaction } : {}),
      ...(mutationOptions.canonicalDeck ? { canonicalDeck: mutationOptions.canonicalDeck } : {})
    });
    return true;
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
      : () => {};

    const nextSelectionState = selectAllElements(insertedElements);
    commitSelectionState(nextSelectionState);
    finalizeMutation(options.versionLabel, {
      transaction: options.transaction,
      ...(options.canonicalDeck ? { canonicalDeck: options.canonicalDeck } : {})
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

    const captureHistoryBaseline = buildCanonicalDeck
      ? (iframeDoc) => {
          const canonicalDeck = buildCanonicalDeck(iframeDoc);
          if (canonicalDeck) {
            saveHistoryState(false, null, canonicalDeck);
          } else {
            saveHistoryState();
          }
        }
      : saveHistoryState;

    if (captureStudioDeckViewBeforeSlideMutation) {
      return (iframeDoc) => captureStudioDeckViewBeforeSlideMutation({
        doc: iframeDoc,
        saveHistoryState: buildCanonicalDeck
          ? () => captureHistoryBaseline(iframeDoc)
          : saveHistoryState,
        getActiveSlideId,
        getCommittedSelectedElementIds
      });
    }

    return (iframeDoc) => {
      captureHistoryBaseline(iframeDoc);
      return {
        preservedActiveSlideId: getActiveSlideId(iframeDoc),
        preservedSelectionIds: getCommittedSelectedElementIds(iframeDoc)
      };
    };
  }

  function finalizeStudioLayerOrderMutation(options = {}) {
    const versionLabel = options.versionLabel || '';
    const transaction = options.transaction || null;
    const hasCanonicalDeck = Object.prototype.hasOwnProperty.call(options, 'canonicalDeck');
    const finalizeMutation = options.finalizeMutation;
    if (typeof finalizeMutation === 'function') {
      const result = finalizeMutation(versionLabel, {
        refreshThumbnails: false,
        refreshLayersList: true,
        transaction,
        ...(hasCanonicalDeck ? { canonicalDeck: options.canonicalDeck } : {})
      });
      if (typeof options.updateLayerOrderActionState === 'function') {
        options.updateLayerOrderActionState();
      }
      return result;
    }

    if (typeof options.saveHistoryState === 'function') {
      if (hasCanonicalDeck) {
        options.saveHistoryState(false, transaction, options.canonicalDeck);
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

  function finalizeStudioWallpaperMutation(options = {}) {
    const versionLabel = options.versionLabel || '';
    const transaction = options.transaction || null;
    const canonicalDeck = options.canonicalDeck || null;
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
