(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorSlideMetadataController = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function createStudioEditorSlideMetadataController(options = {}) {
    const slideMetadataApi = options.slideMetadataApi
      || (root && root.SlideNextStudioEditorSlideMetadata)
      || null;
    const metadataApi = options.metadataApi
      || (root && root.SlideNextStudioEditorNotes)
      || null;
    const metadataActions = options.metadataActions
      || (root && root.SlideNextStudioEditorNotesActions)
      || null;
    const canonicalMetadataApi = options.canonicalMetadataApi
      || (root && root.SlideNextStudioEditorCanonicalMetadata)
      || null;
    const canonicalDeckApi = options.canonicalDeckApi
      || (root && root.SlideNextCanonicalDeck)
      || null;
    const transactionApi = options.transactionApi
      || (root && root.SlideNextStudioEditorTransaction)
      || null;
    const applyStudioActiveSlideMetadataEdit = slideMetadataApi
      && typeof slideMetadataApi.applyStudioActiveSlideMetadataEdit === 'function'
      ? slideMetadataApi.applyStudioActiveSlideMetadataEdit
      : null;
    const buildCanonicalDeck = typeof options.buildCanonicalDeck === 'function'
      ? options.buildCanonicalDeck
      : null;
    const buildCanonicalDeckBaseline = typeof options.buildCanonicalDeckBaseline === 'function'
      ? options.buildCanonicalDeckBaseline
      : null;
    const getCanonicalDeckBaseline = typeof options.getCanonicalDeckBaseline === 'function'
      ? options.getCanonicalDeckBaseline
      : null;
    const getPendingCanonicalDeck = typeof options.getPendingCanonicalDeck === 'function'
      ? options.getPendingCanonicalDeck
      : null;
    const resolveReadyState = typeof options.resolveReadyState === 'function'
      ? options.resolveReadyState
      : () => ({ canUseDeckActions: false });
    const getDocument = typeof options.getDocument === 'function'
      ? options.getDocument
      : () => null;
    const getActiveSlide = typeof options.getActiveSlide === 'function'
      ? options.getActiveSlide
      : () => null;
    const getElementId = typeof options.getElementId === 'function'
      ? options.getElementId
      : () => '';
    const finalizeMutation = typeof options.finalizeMutation === 'function'
      ? options.finalizeMutation
      : null;
    const rollbackMutation = typeof options.rollbackMutation === 'function'
      ? options.rollbackMutation
      : null;
    const syncChrome = typeof options.syncChrome === 'function'
      ? options.syncChrome
      : null;

    function apply(value = '', metadataOptions = {}) {
      if (!applyStudioActiveSlideMetadataEdit) return false;

      return applyStudioActiveSlideMetadataEdit(value, {
        metadataApi,
        metadataActions,
        canonicalMetadataApi,
        canonicalDeckApi,
        buildCanonicalDeck,
        buildCanonicalDeckBaseline,
        getPendingCanonicalDeck,
        getCanonicalDeckBaseline,
        resolveReadyState,
        getDocument,
        getActiveSlide,
        metadataMethod: metadataOptions.metadataMethod,
        transactionApi,
        getElementId,
        ...(metadataOptions.versionLabel ? { versionLabel: metadataOptions.versionLabel } : {}),
        finalizeMutation,
        rollbackMutation,
        syncChrome
      });
    }

    return {
      apply
    };
  }

  return {
    createStudioEditorSlideMetadataController
  };
});
