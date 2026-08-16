(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorNotesActions = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function applyStudioSlideMetadataEdit(value = '', options = {}) {
    const resolveReadyState = typeof options.resolveReadyState === 'function'
      ? options.resolveReadyState
      : () => ({ canUseDeckActions: false });
    let actionState;
    try {
      actionState = resolveReadyState();
    } catch (error) {
      return false;
    }
    if (!actionState || !actionState.canUseDeckActions) return false;

    const getDocument = typeof options.getDocument === 'function'
      ? options.getDocument
      : () => null;
    let documentRef;
    try {
      documentRef = getDocument();
    } catch (error) {
      return false;
    }
    const getActiveSlide = typeof options.getActiveSlide === 'function'
      ? options.getActiveSlide
      : () => null;
    let activeSlide;
    try {
      activeSlide = getActiveSlide(documentRef);
    } catch (error) {
      return false;
    }
    const metadataApi = options.metadataApi && typeof options.metadataApi === 'object'
      ? options.metadataApi
      : null;
    const applyMetadata = typeof options.applyMetadata === 'function'
      ? options.applyMetadata
      : metadataApi && typeof options.metadataMethod === 'string'
        && typeof metadataApi[options.metadataMethod] === 'function'
        ? metadataApi[options.metadataMethod]
      : null;
    const finalizeMutation = typeof options.finalizeMutation === 'function'
      ? options.finalizeMutation
      : null;
    const rollbackMutation = typeof options.rollbackMutation === 'function'
      ? options.rollbackMutation
      : null;
    if (!activeSlide || !applyMetadata || !finalizeMutation) return false;

    const buildCanonicalMetadataBaseline = typeof options.buildCanonicalMetadataBaseline === 'function'
      ? options.buildCanonicalMetadataBaseline
      : null;
    const buildCanonicalMetadataDeck = typeof options.buildCanonicalMetadataDeck === 'function'
      ? options.buildCanonicalMetadataDeck
      : null;
    const canonicalMetadataKey = typeof options.canonicalMetadataKey === 'string'
      ? options.canonicalMetadataKey.trim()
      : '';
    let canonicalDeckBeforeMutation = null;
    let canonicalDeck = null;
    try {
      canonicalDeckBeforeMutation = buildCanonicalMetadataBaseline
        ? buildCanonicalMetadataBaseline({ sourceDocument: documentRef })
        : null;
      canonicalDeck = buildCanonicalMetadataDeck && canonicalMetadataKey
        ? buildCanonicalMetadataDeck(activeSlide, {
            [canonicalMetadataKey]: value
          }, {
            sourceDocument: documentRef,
            canonicalDeckBeforeMutation,
            getSlideId: options.getSlideId
          })
        : null;
    } catch (error) {
      return false;
    }
    if (canonicalDeckBeforeMutation && !canonicalDeck) return false;

    let mutation;
    try {
      mutation = applyMetadata(activeSlide, value, {
        transactionApi: options.transactionApi,
        getElementId: options.getElementId
      });
    } catch (error) {
      return false;
    }
    if (!mutation || !mutation.didApply) return false;

    let finalizeResult = false;
    try {
      finalizeResult = finalizeMutation(options.versionLabel || 'Auto: Updated Speaker Notes', {
        refreshThumbnails: false,
        transaction: mutation.transaction || null,
        ...(canonicalDeck ? { canonicalDeck } : {})
      });
    } catch (error) {
      finalizeResult = false;
    }
    if (finalizeResult === false) {
      if (rollbackMutation) {
        try {
          rollbackMutation(mutation.transaction || null, documentRef);
        } catch (error) {
          // Preserve the failed persistence result if rollback cannot complete.
        }
      }
      if (typeof options.syncChrome === 'function') {
        try {
          options.syncChrome(documentRef);
        } catch (error) {
          // Preserve the failed persistence result if chrome refresh cannot complete.
        }
      }
      return false;
    }
    if (typeof options.syncChrome === 'function') {
      try {
        options.syncChrome(documentRef);
      } catch (error) {
        // A metadata refresh failure must not undo a committed mutation.
      }
    }
    return true;
  }

  function applyStudioSpeakerNotesEdit(value = '', options = {}) {
    return applyStudioSlideMetadataEdit(value, {
      ...options,
      metadataApi: options.notesApi,
      metadataMethod: 'applyStudioSpeakerNotes'
    });
  }

  function applyStudioSlideSectionEdit(value = '', options = {}) {
    return applyStudioSlideMetadataEdit(value, {
      ...options,
      metadataApi: options.sectionApi,
      metadataMethod: 'applyStudioSlideSection',
      versionLabel: options.versionLabel || 'Auto: Updated Slide Section'
    });
  }

  return {
    applyStudioSlideMetadataEdit,
    applyStudioSpeakerNotesEdit,
    applyStudioSlideSectionEdit
  };
});
