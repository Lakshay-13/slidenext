(function initStudioEditorPersistedDeckPlaybackStateAction(root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
    return;
  }
  root.SlideNextStudioEditorPersistedDeckPlaybackStateAction = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function createApi() {
  function createStudioEditorPersistedDeckPlaybackStateAction(options = {}) {
    const getDocument = typeof options.getDocument === 'function'
      ? options.getDocument
      : () => null;
    const getPersistenceController = typeof options.getPersistenceController === 'function'
      ? options.getPersistenceController
      : () => options.persistenceController || null;
    const persistenceApi = options.persistenceApi || null;
    const persistenceStateApi = options.persistenceStateApi || null;
    const deckPersistenceApi = options.deckPersistenceApi || null;
    const getSlides = typeof options.getSlides === 'function'
      ? options.getSlides
      : null;
    const slideIdAttr = typeof options.slideIdAttr === 'string'
      ? options.slideIdAttr
      : '';
    const buildCanonicalDeck = typeof options.buildCanonicalDeck === 'function'
      ? options.buildCanonicalDeck
      : () => null;
    const resolveEditorFallbackActiveSlideId =
      typeof options.resolveFallbackActiveSlideId === 'function'
        ? options.resolveFallbackActiveSlideId
        : null;
    let playbackStateAdapter = null;

    function resolveFallbackActiveSlideId(doc, canonicalDeck) {
      if (!doc || !resolveEditorFallbackActiveSlideId) return '';
      return resolveEditorFallbackActiveSlideId(
        doc,
        canonicalDeck || buildCanonicalDeck(doc)
      );
    }

    function capturePersistedDeckPlaybackState(doc = getDocument(), canonicalDeck = null) {
      const persistenceController = getPersistenceController();
      if (persistenceController
        && typeof persistenceController.capturePersistedDeckPlaybackState === 'function') {
        const playbackState = persistenceController.capturePersistedDeckPlaybackState(doc, {
          canonicalDeck
        });
        if (playbackState !== null && typeof playbackState !== 'undefined') {
          return playbackState;
        }
      }

      const createPlaybackStateAdapter = persistenceStateApi
        && typeof persistenceStateApi.createStudioEditorPersistedDeckPlaybackStateCapturerAdapter === 'function'
        ? persistenceStateApi.createStudioEditorPersistedDeckPlaybackStateCapturerAdapter
        : null;
      if (createPlaybackStateAdapter) {
        if (typeof playbackStateAdapter !== 'function') {
          playbackStateAdapter = createPlaybackStateAdapter({
            persistenceApi,
            deckPersistenceApi,
            getSlides,
            slideIdAttr,
            resolveFallbackActiveSlideId: (nextDoc, nextCanonicalDeck) =>
              resolveFallbackActiveSlideId(nextDoc, nextCanonicalDeck)
          });
        }
        const playbackState = typeof playbackStateAdapter === 'function'
          ? playbackStateAdapter(doc, { canonicalDeck })
          : null;
        if (playbackState !== null && typeof playbackState !== 'undefined') {
          return playbackState;
        }
      }

      const createStudioPersistedDeckPlaybackStateCapturer = persistenceApi
        && typeof persistenceApi.createStudioPersistedDeckPlaybackStateCapturer === 'function'
        ? persistenceApi.createStudioPersistedDeckPlaybackStateCapturer
        : null;
      if (createStudioPersistedDeckPlaybackStateCapturer) {
        const fallbackResolver = doc && resolveEditorFallbackActiveSlideId
          ? () => resolveFallbackActiveSlideId(doc, canonicalDeck)
          : null;
        const capturer = createStudioPersistedDeckPlaybackStateCapturer({
          capturePlaybackState: persistenceApi
            && typeof persistenceApi.captureStudioPersistedDeckPlaybackState === 'function'
            ? persistenceApi.captureStudioPersistedDeckPlaybackState
            : null,
          capturePersistedDeckPlaybackStateWithFallback: deckPersistenceApi
            && typeof deckPersistenceApi.capturePersistedDeckPlaybackStateWithFallback === 'function'
            ? deckPersistenceApi.capturePersistedDeckPlaybackStateWithFallback
            : null,
          capturePersistedDeckPlaybackState: deckPersistenceApi
            && typeof deckPersistenceApi.capturePersistedDeckPlaybackState === 'function'
            ? deckPersistenceApi.capturePersistedDeckPlaybackState
            : null,
          ensurePersistedDeckPlaybackStateActiveSlideId: deckPersistenceApi
            && typeof deckPersistenceApi.ensurePersistedDeckPlaybackStateActiveSlideId === 'function'
            ? deckPersistenceApi.ensurePersistedDeckPlaybackStateActiveSlideId
            : null,
          getSlides,
          slideIdAttr,
          resolveFallbackActiveSlideId: fallbackResolver
        });
        if (typeof capturer === 'function') return capturer(doc);
      }

      const captureStudioPersistedDeckPlaybackState = persistenceApi
        && typeof persistenceApi.captureStudioPersistedDeckPlaybackState === 'function'
        ? persistenceApi.captureStudioPersistedDeckPlaybackState
        : null;
      if (captureStudioPersistedDeckPlaybackState) {
        const fallbackResolver = doc && resolveEditorFallbackActiveSlideId
          ? () => resolveFallbackActiveSlideId(doc, canonicalDeck)
          : null;
        return captureStudioPersistedDeckPlaybackState(doc, {
          capturePersistedDeckPlaybackStateWithFallback: deckPersistenceApi
            && typeof deckPersistenceApi.capturePersistedDeckPlaybackStateWithFallback === 'function'
            ? deckPersistenceApi.capturePersistedDeckPlaybackStateWithFallback
            : null,
          capturePersistedDeckPlaybackState: deckPersistenceApi
            && typeof deckPersistenceApi.capturePersistedDeckPlaybackState === 'function'
            ? deckPersistenceApi.capturePersistedDeckPlaybackState
            : null,
          ensurePersistedDeckPlaybackStateActiveSlideId: deckPersistenceApi
            && typeof deckPersistenceApi.ensurePersistedDeckPlaybackStateActiveSlideId === 'function'
            ? deckPersistenceApi.ensurePersistedDeckPlaybackStateActiveSlideId
            : null,
          getSlides,
          slideIdAttr,
          resolveFallbackActiveSlideId: fallbackResolver
        });
      }

      const capturePersistedDeckPlaybackStateWithFallback = deckPersistenceApi
        && typeof deckPersistenceApi.capturePersistedDeckPlaybackStateWithFallback === 'function'
        ? deckPersistenceApi.capturePersistedDeckPlaybackStateWithFallback
        : null;
      if (capturePersistedDeckPlaybackStateWithFallback) {
        const fallbackResolver = doc && resolveEditorFallbackActiveSlideId
          ? () => resolveFallbackActiveSlideId(doc, canonicalDeck)
          : null;
        return capturePersistedDeckPlaybackStateWithFallback(doc, {
          getSlides,
          slideIdAttr,
          resolveFallbackActiveSlideId: fallbackResolver
        });
      }

      const captureDeckPlaybackState = deckPersistenceApi
        && typeof deckPersistenceApi.capturePersistedDeckPlaybackState === 'function'
        ? deckPersistenceApi.capturePersistedDeckPlaybackState
        : null;
      if (!captureDeckPlaybackState) return null;

      const playbackState = captureDeckPlaybackState(doc, {
        getSlides,
        slideIdAttr
      });
      if (!doc) return playbackState;

      const ensurePersistedDeckPlaybackStateActiveSlideId = deckPersistenceApi
        && typeof deckPersistenceApi.ensurePersistedDeckPlaybackStateActiveSlideId === 'function'
        ? deckPersistenceApi.ensurePersistedDeckPlaybackStateActiveSlideId
        : null;
      if (ensurePersistedDeckPlaybackStateActiveSlideId) {
        return ensurePersistedDeckPlaybackStateActiveSlideId(playbackState, {
          resolveFallbackActiveSlideId: () => resolveFallbackActiveSlideId(doc, canonicalDeck)
        });
      }

      const hasActiveSlideIds = !!(playbackState
        && Array.isArray(playbackState.activeSlideIds)
        && playbackState.activeSlideIds.some((slideId) => typeof slideId === 'string' && slideId.trim()));
      if (hasActiveSlideIds) return playbackState;

      const fallbackActiveSlideId = resolveFallbackActiveSlideId(doc, canonicalDeck);
      if (!fallbackActiveSlideId) return playbackState;

      return {
        activeSlideIds: [fallbackActiveSlideId],
        slideCounterText: playbackState && typeof playbackState.slideCounterText === 'string'
          ? playbackState.slideCounterText
          : ''
      };
    }

    return capturePersistedDeckPlaybackState;
  }

  function createStudioEditorPersistedDeckPlaybackStateGlobalApi(options = {}) {
    const capturePersistedDeckPlaybackState =
      typeof options.capturePersistedDeckPlaybackState === 'function'
        ? options.capturePersistedDeckPlaybackState
        : null;
    return {
      capturePersistedDeckPlaybackState: (...args) => capturePersistedDeckPlaybackState
        ? capturePersistedDeckPlaybackState(...args)
        : null
    };
  }

  return {
    createStudioEditorPersistedDeckPlaybackStateAction,
    createStudioEditorPersistedDeckPlaybackStateGlobalApi
  };
}));
