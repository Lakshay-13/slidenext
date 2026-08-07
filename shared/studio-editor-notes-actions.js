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
    const actionState = resolveReadyState();
    if (!actionState || !actionState.canUseDeckActions) return false;

    const getDocument = typeof options.getDocument === 'function'
      ? options.getDocument
      : () => null;
    const documentRef = getDocument();
    const getActiveSlide = typeof options.getActiveSlide === 'function'
      ? options.getActiveSlide
      : () => null;
    const activeSlide = getActiveSlide(documentRef);
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
    const canonicalDeckBeforeMutation = buildCanonicalMetadataBaseline
      ? buildCanonicalMetadataBaseline({ sourceDocument: documentRef })
      : null;

    const mutation = applyMetadata(activeSlide, value, {
      transactionApi: options.transactionApi,
      getElementId: options.getElementId
    });
    if (!mutation || !mutation.didApply) return false;

    const canonicalDeck = buildCanonicalMetadataDeck && canonicalMetadataKey
      ? buildCanonicalMetadataDeck(activeSlide, {
          [canonicalMetadataKey]: value
        }, {
          sourceDocument: documentRef,
          canonicalDeckBeforeMutation,
          getSlideId: options.getSlideId
        })
      : null;

    finalizeMutation(options.versionLabel || 'Auto: Updated Speaker Notes', {
      refreshThumbnails: false,
      transaction: mutation.transaction || null,
      ...(canonicalDeck ? { canonicalDeck } : {})
    });
    if (typeof options.syncChrome === 'function') {
      options.syncChrome(documentRef);
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
