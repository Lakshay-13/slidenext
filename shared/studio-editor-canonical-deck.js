(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorCanonicalDeck = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function isCanonicalDeckLike(value) {
    return !!value
      && typeof value === 'object'
      && !Array.isArray(value)
      && Array.isArray(value.slides);
  }

  const sharedCanonicalDeckValidator = root
    && root.SlideNextStudioEditorCanonicalState
    && typeof root.SlideNextStudioEditorCanonicalState.isStudioEditorCanonicalDeckLike === 'function'
    ? root.SlideNextStudioEditorCanonicalState.isStudioEditorCanonicalDeckLike
    : null;

  function createStudioCanonicalDeckBuilder(options = {}) {
    const isCanonicalDeck = typeof options.isCanonicalDeck === 'function'
      ? options.isCanonicalDeck
      : sharedCanonicalDeckValidator || isCanonicalDeckLike;
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
      const persistedCanonicalDeck = readPersistedCanonicalDeck();
      const storedCanonicalDeckCandidate = resolveStoredCanonicalBaseline({
        currentPresentationMetadata: presentationMetadata,
        persistedCanonicalDeck
      });
      const storedCanonicalDeck = isValidCanonicalDeck(storedCanonicalDeckCandidate)
        ? storedCanonicalDeckCandidate
        : null;
      const canonicalDeckBaseline = isValidCanonicalDeck(buildOptions.canonicalDeckBaseline)
        ? buildOptions.canonicalDeckBaseline
        : storedCanonicalDeck;
      if (buildStudioCanonicalDeck) {
        try {
          const studioCanonicalDeck = buildStudioCanonicalDeck(doc, {
            currentPresentationMetadata: presentationMetadata,
            fallbackStoredPresentationMetadata: {
              canonicalDeck: persistedCanonicalDeck
            },
            buildPresentationMetadataSeed,
            presentationUrl,
            presentationTitle,
            preferStoredCanonicalDeck: false,
            canonicalDeckBaseline,
            getSlideId: options.getSlideId,
            getNodeId: options.getNodeId
          });
          if (isValidCanonicalDeck(studioCanonicalDeck)) {
            return studioCanonicalDeck;
          }
        } catch (error) {
          // Continue through stored and direct-import fallback sources.
        }
      }

      if (!doc && storedCanonicalDeck) {
        return storedCanonicalDeck;
      }
      if (!buildCanonicalDeckFromDocument) {
        return storedCanonicalDeck || null;
      }

      try {
        const canonicalDeck = buildCanonicalDeckFromDocument(doc, {
        presentationMetadata: presentationMetadata || buildPresentationMetadataSeed(presentationUrl, presentationTitle),
        sourcePath: presentationUrl,
          canonicalDeckBaseline,
          getSlideId: options.getSlideId,
          getNodeId: options.getNodeId
        });
        if (isValidCanonicalDeck(canonicalDeck)) {
          return canonicalDeck;
        }
      } catch (error) {
        // Preserve the stored canonical baseline when direct import fails.
      }
      return storedCanonicalDeck || null;
    };
  }

  return {
    createStudioCanonicalDeckBuilder
  };
});
