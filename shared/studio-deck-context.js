(function (root, factory) {
  const deckLoader = typeof module === 'object' && module.exports
    ? require('./deck-loader')
    : root && root.SlideNextDeckLoader;
  const api = factory(deckLoader);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioDeckContext = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (deckLoader) {
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

    const metadata = await loadMetadata(presentationUrl, presentationTitle, {
      fetchImpl: options.fetchImpl,
      requestInit: options.requestInit,
      onError: options.onError
    });

    if (typeof options.setCurrentPresentationMetadata === 'function'
      && options.currentPresentationUrl === presentationUrl) {
      options.setCurrentPresentationMetadata(metadata);
    }

    return metadata;
  }

  function buildStudioCanonicalDeck(doc, options = {}) {
    if (!deckLoader || typeof deckLoader.buildCanonicalDeckFromDocument !== 'function') {
      return null;
    }

    const presentationMetadata = options.currentPresentationMetadata
      || (typeof options.buildPresentationMetadataSeed === 'function'
        ? options.buildPresentationMetadataSeed(options.presentationUrl, options.presentationTitle)
        : buildStudioPresentationMetadataSeed(options.presentationUrl, options.presentationTitle));

    return deckLoader.buildCanonicalDeckFromDocument(doc, {
      presentationMetadata,
      sourcePath: options.presentationUrl || '',
      getSlideId: options.getSlideId,
      getNodeId: options.getNodeId
    });
  }

  return {
    buildStudioPresentationMetadataSeed,
    loadStudioPresentationMetadata,
    buildStudioCanonicalDeck
  };
});
