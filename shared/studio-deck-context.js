(function (root, factory) {
  const deckLoader = typeof module === 'object' && module.exports
    ? require('./deck-loader')
    : root && root.SlideNextDeckLoader;
  const canonicalDeck = typeof module === 'object' && module.exports
    ? require('./canonical-deck')
    : root && root.SlideNextCanonicalDeck;
  const api = factory(deckLoader, canonicalDeck);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioDeckContext = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (deckLoader, canonicalDeck) {
  function buildStudioPresentationMetadataSeed(presentationUrl = '', presentationTitle = '') {
    if (!deckLoader || typeof deckLoader.buildPresentationMetadataSeed !== 'function') {
      return {
        id: '',
        title: presentationTitle || '',
        sourcePath: presentationUrl || ''
      };
    }
    return deckLoader.buildPresentationMetadataSeed(presentationUrl, presentationTitle);
  }

  async function loadStudioPresentationMetadata(presentationUrl = '', presentationTitle = '', options = {}) {
    const loadMetadata = deckLoader && typeof deckLoader.loadPresentationMetadata === 'function'
      ? deckLoader.loadPresentationMetadata
      : async () => buildStudioPresentationMetadataSeed(presentationUrl, presentationTitle);
    const getCurrentPresentationUrl = typeof options.getCurrentPresentationUrl === 'function'
      ? options.getCurrentPresentationUrl
      : () => options.currentPresentationUrl;

    const metadata = await loadMetadata(presentationUrl, presentationTitle, {
      fetchImpl: options.fetchImpl,
      requestInit: options.requestInit,
      onError: options.onError
    });

    if (typeof options.setCurrentPresentationMetadata === 'function'
      && getCurrentPresentationUrl() === presentationUrl) {
      options.setCurrentPresentationMetadata(metadata);
    }

    return metadata;
  }

  function buildStudioCanonicalDeck(doc, options = {}) {
    const buildCanonicalDeckFromDocument = typeof options.buildCanonicalDeckFromDocument === 'function'
      ? options.buildCanonicalDeckFromDocument
      : deckLoader && typeof deckLoader.buildCanonicalDeckFromDocument === 'function'
        ? deckLoader.buildCanonicalDeckFromDocument
        : null;
    if (!buildCanonicalDeckFromDocument) {
      return null;
    }
    const isCanonicalDeck = typeof options.isCanonicalDeck === 'function'
      ? options.isCanonicalDeck
      : canonicalDeck && typeof canonicalDeck.isCanonicalDeck === 'function'
        ? canonicalDeck.isCanonicalDeck
        : null;

    const presentationMetadata = options.currentPresentationMetadata
      || (typeof options.buildPresentationMetadataSeed === 'function'
        ? options.buildPresentationMetadataSeed(options.presentationUrl, options.presentationTitle)
        : buildStudioPresentationMetadataSeed(options.presentationUrl, options.presentationTitle));

    const deck = buildCanonicalDeckFromDocument(doc, {
      presentationMetadata,
      sourcePath: options.presentationUrl || '',
      getSlideId: options.getSlideId,
      getNodeId: options.getNodeId
    });
    if (deck && isCanonicalDeck && !isCanonicalDeck(deck)) {
      return null;
    }

    return deck;
  }

  return {
    buildStudioPresentationMetadataSeed,
    loadStudioPresentationMetadata,
    buildStudioCanonicalDeck
  };
});
