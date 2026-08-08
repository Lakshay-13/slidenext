(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorSlideMetadata = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function applyStudioActiveSlideMetadataEdit(value = '', options = {}) {
    const metadataApi = options.metadataApi && typeof options.metadataApi === 'object'
      ? options.metadataApi
      : null;
    const metadataActions = options.metadataActions && typeof options.metadataActions === 'object'
      ? options.metadataActions
      : null;
    if (!metadataApi || !metadataActions || typeof metadataActions.applyStudioSlideMetadataEdit !== 'function') {
      return false;
    }

    const canonicalMetadataApi = options.canonicalMetadataApi && typeof options.canonicalMetadataApi === 'object'
      ? options.canonicalMetadataApi
      : null;
    const canonicalMetadataBuilders = canonicalMetadataApi
      && typeof canonicalMetadataApi.createStudioCanonicalMetadataMutationBuilders === 'function'
      ? canonicalMetadataApi.createStudioCanonicalMetadataMutationBuilders({
          canonicalDeckApi: options.canonicalDeckApi && typeof options.canonicalDeckApi === 'object'
            ? options.canonicalDeckApi
            : null,
          buildCanonicalDeck: typeof options.buildCanonicalDeck === 'function'
            ? options.buildCanonicalDeck
            : null,
          buildCanonicalDeckBaseline: typeof options.buildCanonicalDeckBaseline === 'function'
            ? options.buildCanonicalDeckBaseline
            : null,
          getCanonicalDeckBaseline: typeof options.getCanonicalDeckBaseline === 'function'
            ? options.getCanonicalDeckBaseline
            : null
        })
      : null;

    return metadataActions.applyStudioSlideMetadataEdit(value, {
      resolveReadyState: options.resolveReadyState,
      getDocument: options.getDocument,
      getActiveSlide: options.getActiveSlide,
      metadataApi,
      metadataMethod: options.metadataMethod,
      ...(options.versionLabel ? { versionLabel: options.versionLabel } : {}),
      transactionApi: options.transactionApi && typeof options.transactionApi === 'object'
        ? options.transactionApi
        : null,
      getElementId: options.getElementId,
      canonicalMetadataKey: options.metadataMethod === 'applyStudioSlideSection' ? 'section' : 'notes',
      buildCanonicalMetadataBaseline: canonicalMetadataBuilders
        ? canonicalMetadataBuilders.buildCanonicalMetadataBaseline
        : null,
      buildCanonicalMetadataDeck: canonicalMetadataBuilders
        ? canonicalMetadataBuilders.buildCanonicalMetadataDeck
        : null,
      finalizeMutation: options.finalizeMutation,
      syncChrome: options.syncChrome
    });
  }

  return {
    applyStudioActiveSlideMetadataEdit
  };
});
