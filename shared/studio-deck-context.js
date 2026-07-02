(function (root, factory) {
  const deckLoader = typeof module === 'object' && module.exports
    ? require('./deck-loader')
    : root && root.SlideNextDeckLoader;
  const canonicalDeck = typeof module === 'object' && module.exports
    ? require('./canonical-deck')
    : root && root.SlideNextCanonicalDeck;
  const presentationMetadata = typeof module === 'object' && module.exports
    ? require('./presentation-metadata')
    : root && root.SlideNextPresentationMetadata;
  const api = factory(deckLoader, canonicalDeck, presentationMetadata);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioDeckContext = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (deckLoader, canonicalDeck, presentationMetadata) {
  function normalizeSessionToken(value) {
    return Number.isInteger(value) ? value : null;
  }

  function resolveStoredStudioCanonicalDeck(storedPresentationMetadata = {}, options = {}) {
    const resolvePresentationCanonicalDeck = typeof options.resolvePresentationCanonicalDeck === 'function'
      ? options.resolvePresentationCanonicalDeck
      : presentationMetadata && typeof presentationMetadata.resolvePresentationCanonicalDeck === 'function'
        ? presentationMetadata.resolvePresentationCanonicalDeck
        : null;
    if (!resolvePresentationCanonicalDeck) {
      return null;
    }

    return resolvePresentationCanonicalDeck(storedPresentationMetadata, {
      createCanonicalDeck: options.createCanonicalDeck,
      isCanonicalDeck: options.isCanonicalDeck
    });
  }

  function resolvePreferredStoredStudioCanonicalDeck(
    primaryStoredPresentationMetadata = {},
    fallbackStoredPresentationMetadata = {},
    options = {}
  ) {
    const primaryCanonicalDeck = resolveStoredStudioCanonicalDeck(primaryStoredPresentationMetadata, options);
    if (primaryCanonicalDeck) {
      return primaryCanonicalDeck;
    }
    return resolveStoredStudioCanonicalDeck(fallbackStoredPresentationMetadata, options);
  }

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

  function createStudioPresentationMetadataLoadOptions(options = {}) {
    return {
      sessionToken: normalizeSessionToken(options.sessionToken),
      getCurrentPresentationUrl: options.getCurrentPresentationUrl,
      getCurrentSessionToken: options.getCurrentSessionToken,
      setCurrentPresentationMetadata: options.setCurrentPresentationMetadata,
      onError: options.onError
    };
  }

  async function loadStudioPresentationMetadata(presentationUrl = '', presentationTitle = '', options = {}) {
    const loadMetadata = deckLoader && typeof deckLoader.loadPresentationMetadata === 'function'
      ? deckLoader.loadPresentationMetadata
      : async () => buildStudioPresentationMetadataSeed(presentationUrl, presentationTitle);
    const getCurrentPresentationUrl = typeof options.getCurrentPresentationUrl === 'function'
      ? options.getCurrentPresentationUrl
      : () => options.currentPresentationUrl;
    const requestedSessionToken = normalizeSessionToken(options.sessionToken);

    const metadata = await loadMetadata(presentationUrl, presentationTitle, {
      fetchImpl: options.fetchImpl,
      requestInit: options.requestInit,
      onError: options.onError
    });

    const getCurrentSessionToken = typeof options.getCurrentSessionToken === 'function'
      ? options.getCurrentSessionToken
      : () => options.currentSessionToken;
    if (typeof options.setCurrentPresentationMetadata === 'function'
      && getCurrentPresentationUrl() === presentationUrl
      && (requestedSessionToken === null || normalizeSessionToken(getCurrentSessionToken()) === requestedSessionToken)) {
      options.setCurrentPresentationMetadata(metadata);
    }

    return metadata;
  }

  function mergeStudioPresentationMetadataCanonicalDeck(canonicalDeckLike = null, options = {}) {
    const currentPresentationMetadata = options.currentPresentationMetadata
      || (typeof options.buildPresentationMetadataSeed === 'function'
        ? options.buildPresentationMetadataSeed(options.presentationUrl, options.presentationTitle)
        : buildStudioPresentationMetadataSeed(options.presentationUrl, options.presentationTitle));
    const mergePresentationCanonicalDeck = typeof options.mergePresentationCanonicalDeck === 'function'
      ? options.mergePresentationCanonicalDeck
      : presentationMetadata && typeof presentationMetadata.mergePresentationCanonicalDeck === 'function'
        ? presentationMetadata.mergePresentationCanonicalDeck
        : null;
    if (!mergePresentationCanonicalDeck) {
      return currentPresentationMetadata;
    }

    return mergePresentationCanonicalDeck(currentPresentationMetadata, canonicalDeckLike, {
      createCanonicalDeck: options.createCanonicalDeck,
      isCanonicalDeck: options.isCanonicalDeck
    });
  }

  function resolveStudioPresentationMetadataCanonicalDeckUpdate(canonicalDeckLike = null, options = {}) {
    const currentPresentationUrl = Object.prototype.hasOwnProperty.call(options, 'currentPresentationUrl')
      ? options.currentPresentationUrl
      : options.presentationUrl;
    if (!canonicalDeckLike || options.presentationUrl !== currentPresentationUrl) {
      return null;
    }

    const nextCanonicalDeck = resolveStoredStudioCanonicalDeck({
      canonicalDeck: canonicalDeckLike
    }, {
      createCanonicalDeck: options.createCanonicalDeck,
      isCanonicalDeck: options.isCanonicalDeck,
      resolvePresentationCanonicalDeck: options.resolvePresentationCanonicalDeck
    });
    if (!nextCanonicalDeck) {
      return null;
    }

    return mergeStudioPresentationMetadataCanonicalDeck(nextCanonicalDeck, options);
  }

  function buildStudioCanonicalDeck(doc, options = {}) {
    const createCanonicalDeck = typeof options.createCanonicalDeck === 'function'
      ? options.createCanonicalDeck
      : canonicalDeck && typeof canonicalDeck.createCanonicalDeck === 'function'
        ? canonicalDeck.createCanonicalDeck
        : null;
    const isCanonicalDeck = typeof options.isCanonicalDeck === 'function'
      ? options.isCanonicalDeck
      : canonicalDeck && typeof canonicalDeck.isCanonicalDeck === 'function'
        ? canonicalDeck.isCanonicalDeck
        : null;

    const currentPresentationMetadata = options.currentPresentationMetadata
      || (typeof options.buildPresentationMetadataSeed === 'function'
        ? options.buildPresentationMetadataSeed(options.presentationUrl, options.presentationTitle)
        : buildStudioPresentationMetadataSeed(options.presentationUrl, options.presentationTitle));
    const fallbackStoredPresentationMetadata = Object.prototype.hasOwnProperty.call(options, 'fallbackStoredPresentationMetadata')
      ? options.fallbackStoredPresentationMetadata
      : null;
    const storedCanonicalDeck = resolvePreferredStoredStudioCanonicalDeck(
      currentPresentationMetadata,
      fallbackStoredPresentationMetadata,
      {
      createCanonicalDeck,
      isCanonicalDeck
      }
    );
    if (storedCanonicalDeck && (options.preferStoredCanonicalDeck !== false || !doc)) {
      return storedCanonicalDeck;
    }

    const buildCanonicalDeckFromDocument = typeof options.buildCanonicalDeckFromDocument === 'function'
      ? options.buildCanonicalDeckFromDocument
      : deckLoader && typeof deckLoader.buildCanonicalDeckFromDocument === 'function'
        ? deckLoader.buildCanonicalDeckFromDocument
        : null;
    if (!buildCanonicalDeckFromDocument) {
      return storedCanonicalDeck || null;
    }

    const deck = buildCanonicalDeckFromDocument(doc, {
      presentationMetadata: currentPresentationMetadata,
      sourcePath: options.presentationUrl || '',
      getSlideId: options.getSlideId,
      getNodeId: options.getNodeId
    });
    if (deck && isCanonicalDeck && !isCanonicalDeck(deck)) {
      return storedCanonicalDeck || null;
    }

    return deck;
  }

  return {
    buildStudioPresentationMetadataSeed,
    createStudioPresentationMetadataLoadOptions,
    loadStudioPresentationMetadata,
    mergeStudioPresentationMetadataCanonicalDeck,
    resolveStudioPresentationMetadataCanonicalDeckUpdate,
    resolvePreferredStoredStudioCanonicalDeck,
    resolveStoredStudioCanonicalDeck,
    buildStudioCanonicalDeck
  };
});
