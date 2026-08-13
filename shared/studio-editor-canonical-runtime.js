(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorCanonicalRuntime = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function isCanonicalDeckLike(value) {
    return !!value
      && typeof value === 'object'
      && !Array.isArray(value)
      && Array.isArray(value.slides);
  }

  function createStudioEditorCanonicalRuntime(options = {}) {
    const canonicalStateApi = options.canonicalStateApi
      && typeof options.canonicalStateApi.createStudioEditorCanonicalState === 'function'
      ? options.canonicalStateApi
      : null;
    const canonicalDeckApi = options.canonicalDeckApi
      && typeof options.canonicalDeckApi.createStudioCanonicalDeckBuilder === 'function'
      ? options.canonicalDeckApi
      : null;
    const canonicalMutationApi = options.canonicalMutationApi
      && typeof options.canonicalMutationApi.createStudioEditorMutationCanonicalDeckBuilder === 'function'
      ? options.canonicalMutationApi
      : null;
    const canonicalBridgeApi = options.canonicalBridgeApi
      && typeof options.canonicalBridgeApi.createStudioEditorCanonicalBridge === 'function'
      ? options.canonicalBridgeApi
      : null;
    const isCanonicalDeck = typeof options.isCanonicalDeck === 'function'
      ? options.isCanonicalDeck
      : null;
    const sharedCanonicalDeckValidator = canonicalStateApi
      && typeof canonicalStateApi.isStudioEditorCanonicalDeckLike === 'function'
      ? canonicalStateApi.isStudioEditorCanonicalDeckLike
      : null;
    const fallbackCanonicalDeckValidator = isCanonicalDeck
      || sharedCanonicalDeckValidator
      || isCanonicalDeckLike;

    const canonicalState = canonicalStateApi
      ? canonicalStateApi.createStudioEditorCanonicalState({
          isCanonicalDeck: fallbackCanonicalDeckValidator
        })
      : null;
    const canonicalDeckBuilder = canonicalDeckApi
      ? canonicalDeckApi.createStudioCanonicalDeckBuilder({
          isCanonicalDeck: fallbackCanonicalDeckValidator,
          getCurrentPresentationMetadata: options.getCurrentPresentationMetadata,
          getPersistedCanonicalDeck: options.getPersistedCanonicalDeck,
          resolveLiveCanonicalDeck: options.resolveLiveCanonicalDeck,
          resolveStoredCanonicalBaseline: options.resolveStoredCanonicalBaseline,
          buildPresentationMetadataSeed: options.buildPresentationMetadataSeed,
          getPresentationUrl: options.getPresentationUrl,
          getPresentationTitle: options.getPresentationTitle,
          buildStudioCanonicalDeck: options.buildStudioCanonicalDeck,
          buildCanonicalDeckFromDocument: options.buildCanonicalDeckFromDocument,
          getSlideId: options.getSlideId,
          getNodeId: options.getNodeId
        })
      : null;
    const mutationCanonicalDeckBuilder = canonicalMutationApi
      ? canonicalMutationApi.createStudioEditorMutationCanonicalDeckBuilder({
          buildCanonicalDeck: options.buildCanonicalDeck,
          getCanonicalDeckBaseline: options.getCanonicalDeckBaseline,
          isCanonicalDeck
        })
      : null;
    const canonicalBridge = canonicalBridgeApi
      ? canonicalBridgeApi.createStudioEditorCanonicalBridge({
          state: canonicalState,
          canonicalDeckBuilder,
          mutationCanonicalDeckBuilder,
          getCanonicalDeckBaseline: options.getCanonicalDeckBaseline,
          isCanonicalDeck,
          getDocument: options.getDocument
        })
      : null;

    return {
      canonicalState,
      canonicalDeckBuilder,
      mutationCanonicalDeckBuilder,
      canonicalBridge
    };
  }

  return {
    createStudioEditorCanonicalRuntime
  };
});
