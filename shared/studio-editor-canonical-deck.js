(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorCanonicalDeck = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function isCanonicalDeckLike(value) {
    return !!value && typeof value === 'object' && Array.isArray(value.slides);
  }

  function createStudioCanonicalDeckBuilder(options = {}) {
    const isCanonicalDeck = typeof options.isCanonicalDeck === 'function'
      ? options.isCanonicalDeck
      : isCanonicalDeckLike;
    const readCurrentPresentationMetadata = typeof options.getCurrentPresentationMetadata === 'function'
      ? options.getCurrentPresentationMetadata
      : () => null;
    const readPersistedCanonicalDeck = typeof options.getPersistedCanonicalDeck === 'function'
      ? options.getPersistedCanonicalDeck
      : () => null;
    const resolveLiveCanonicalDeck = typeof options.resolveLiveCanonicalDeck === 'function'
      ? options.resolveLiveCanonicalDeck
      : () => null;
    const resolveStoredCanonicalBaseline = typeof options.resolveStoredCanonicalBaseline === 'function'
      ? options.resolveStoredCanonicalBaseline
      : () => null;
    const buildPresentationMetadataSeed = typeof options.buildPresentationMetadataSeed === 'function'
      ? options.buildPresentationMetadataSeed
      : () => ({ title: '', sourcePath: '' });
    const readPresentationUrl = typeof options.getPresentationUrl === 'function'
      ? options.getPresentationUrl
      : () => '';
    const readPresentationTitle = typeof options.getPresentationTitle === 'function'
      ? options.getPresentationTitle
      : () => '';
    const buildStudioCanonicalDeck = typeof options.buildStudioCanonicalDeck === 'function'
      ? options.buildStudioCanonicalDeck
      : null;
    const buildCanonicalDeckFromDocument = typeof options.buildCanonicalDeckFromDocument === 'function'
      ? options.buildCanonicalDeckFromDocument
      : null;

    return function buildStudioEditorCanonicalDeck(doc = null, buildOptions = {}) {
      const canonicalDeckOverride = Object.prototype.hasOwnProperty.call(buildOptions, 'canonicalDeckOverride')
        ? buildOptions.canonicalDeckOverride
        : null;
      if (isCanonicalDeck(canonicalDeckOverride)) {
        return canonicalDeckOverride;
      }

      if (buildOptions.preferLiveCanonicalDeck !== false && doc) {
        const liveCanonicalDeck = resolveLiveCanonicalDeck(doc, buildOptions);
        if (isCanonicalDeck(liveCanonicalDeck)) {
          return liveCanonicalDeck;
        }
      }

      const presentationMetadata = readCurrentPresentationMetadata();
      const presentationUrl = readPresentationUrl();
      const presentationTitle = readPresentationTitle();
      if (buildStudioCanonicalDeck) {
        return buildStudioCanonicalDeck(doc, {
          currentPresentationMetadata: presentationMetadata,
          fallbackStoredPresentationMetadata: {
            canonicalDeck: readPersistedCanonicalDeck()
          },
          buildPresentationMetadataSeed,
          presentationUrl,
          presentationTitle,
          preferStoredCanonicalDeck: false,
          getSlideId: options.getSlideId,
          getNodeId: options.getNodeId
        });
      }

      const storedCanonicalDeck = resolveStoredCanonicalBaseline({
        currentPresentationMetadata: presentationMetadata,
        persistedCanonicalDeck: readPersistedCanonicalDeck()
      });
      if (!doc && storedCanonicalDeck) {
        return storedCanonicalDeck;
      }
      if (!buildCanonicalDeckFromDocument) {
        return storedCanonicalDeck || null;
      }

      const canonicalDeck = buildCanonicalDeckFromDocument(doc, {
        presentationMetadata: presentationMetadata || buildPresentationMetadataSeed(presentationUrl, presentationTitle),
        sourcePath: presentationUrl,
        getSlideId: options.getSlideId,
        getNodeId: options.getNodeId
      });
      if (canonicalDeck && isCanonicalDeck(canonicalDeck)) {
        return canonicalDeck;
      }
      return storedCanonicalDeck || null;
    };
  }

  return {
    createStudioCanonicalDeckBuilder
  };
});
