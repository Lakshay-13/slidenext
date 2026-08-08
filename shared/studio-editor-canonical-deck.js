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
    const isValidCanonicalDeck = (value) => {
      try {
        return isCanonicalDeck(value) === true;
      } catch (error) {
        return false;
      }
    };
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
      if (isValidCanonicalDeck(canonicalDeckOverride)) {
        return canonicalDeckOverride;
      }

      if (buildOptions.preferLiveCanonicalDeck !== false && doc) {
        try {
          const liveCanonicalDeck = resolveLiveCanonicalDeck(doc, buildOptions);
          if (isValidCanonicalDeck(liveCanonicalDeck)) {
            return liveCanonicalDeck;
          }
        } catch (error) {
          // Continue through stored and DOM-derived fallback sources.
        }
      }

      const presentationMetadata = readCurrentPresentationMetadata();
      const presentationUrl = readPresentationUrl();
      const presentationTitle = readPresentationTitle();
      if (buildStudioCanonicalDeck) {
        const studioCanonicalDeck = buildStudioCanonicalDeck(doc, {
          currentPresentationMetadata: presentationMetadata,
          fallbackStoredPresentationMetadata: {
            canonicalDeck: readPersistedCanonicalDeck()
          },
          buildPresentationMetadataSeed,
          presentationUrl,
          presentationTitle,
          preferStoredCanonicalDeck: false,
          canonicalDeckBaseline: buildOptions.canonicalDeckBaseline,
          getSlideId: options.getSlideId,
          getNodeId: options.getNodeId
        });
        if (isValidCanonicalDeck(studioCanonicalDeck)) {
          return studioCanonicalDeck;
        }
      }

      const storedCanonicalDeckCandidate = resolveStoredCanonicalBaseline({
        currentPresentationMetadata: presentationMetadata,
        persistedCanonicalDeck: readPersistedCanonicalDeck()
      });
      const storedCanonicalDeck = isValidCanonicalDeck(storedCanonicalDeckCandidate)
        ? storedCanonicalDeckCandidate
        : null;
      if (!doc && storedCanonicalDeck) {
        return storedCanonicalDeck;
      }
      if (!buildCanonicalDeckFromDocument) {
        return storedCanonicalDeck || null;
      }

      const canonicalDeck = buildCanonicalDeckFromDocument(doc, {
        presentationMetadata: presentationMetadata || buildPresentationMetadataSeed(presentationUrl, presentationTitle),
        sourcePath: presentationUrl,
        canonicalDeckBaseline: buildOptions.canonicalDeckBaseline,
        getSlideId: options.getSlideId,
        getNodeId: options.getNodeId
      });
      if (isValidCanonicalDeck(canonicalDeck)) {
        return canonicalDeck;
      }
      return storedCanonicalDeck || null;
    };
  }

  return {
    createStudioCanonicalDeckBuilder
  };
});
