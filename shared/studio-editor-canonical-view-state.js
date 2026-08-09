(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorCanonicalViewState = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function resolveDeckViewApi(options = {}) {
    return options.deckViewApi && typeof options.deckViewApi === 'object'
      ? options.deckViewApi
      : null;
  }

  function resolveCanonicalBuilder(options = {}) {
    if (typeof options.buildCanonicalDeck === 'function') {
      return options.buildCanonicalDeck;
    }
    if (typeof options.fallbackBuildCanonicalDeck === 'function') {
      return options.fallbackBuildCanonicalDeck;
    }
    return () => null;
  }

  function resolveLiveActiveSlideIdBuilder(options = {}) {
    if (typeof options.resolveLiveActiveSlideId === 'function') {
      return options.resolveLiveActiveSlideId;
    }
    if (typeof options.fallbackResolveLiveActiveSlideId === 'function') {
      return options.fallbackResolveLiveActiveSlideId;
    }
    return () => '';
  }

  function createStudioEditorCanonicalDeckViewStateOptions(options = {}) {
    const deckViewApi = resolveDeckViewApi(options);
    const buildCanonicalDeck = resolveCanonicalBuilder(options);
    const resolveLiveActiveSlideId = resolveLiveActiveSlideIdBuilder(options);
    if (deckViewApi && typeof deckViewApi.createStudioDeckViewCanonicalStateOptions === 'function') {
      const sharedOptions = deckViewApi.createStudioDeckViewCanonicalStateOptions({
        buildCanonicalDeck,
        resolveLiveActiveSlideId
      });
      if (sharedOptions
        && typeof sharedOptions.buildCanonicalDeck === 'function'
        && typeof sharedOptions.resolveLiveActiveSlideId === 'function') {
        return sharedOptions;
      }
      return {
        buildCanonicalDeck: sharedOptions
          && typeof sharedOptions.buildCanonicalDeck === 'function'
          ? sharedOptions.buildCanonicalDeck
          : buildCanonicalDeck,
        resolveLiveActiveSlideId: sharedOptions
          && typeof sharedOptions.resolveLiveActiveSlideId === 'function'
          ? sharedOptions.resolveLiveActiveSlideId
          : resolveLiveActiveSlideId
      };
    }
    return { buildCanonicalDeck, resolveLiveActiveSlideId };
  }

  function resolveStudioEditorCanonicalDeckViewState(doc, options = {}) {
    const deckViewApi = resolveDeckViewApi(options);
    const deckViewStateOptions = createStudioEditorCanonicalDeckViewStateOptions(options);
    const {
      buildCanonicalDeck,
      resolveLiveActiveSlideId
    } = deckViewStateOptions;
    if (deckViewApi && typeof deckViewApi.resolveStudioCanonicalDeckViewState === 'function') {
      return deckViewApi.resolveStudioCanonicalDeckViewState(doc, {
        buildCanonicalDeck,
        resolveLiveActiveSlideId
      });
    }
    const liveActiveSlideId = resolveLiveActiveSlideId(doc);
    return {
      resolveCanonicalDeck: () => null,
      liveActiveSlideId,
      resolvedCanonicalDeck: null
    };
  }

  function getEditorDeckViewSharedOptions(doc, options = {}) {
    return typeof options.getDeckViewSharedOptions === 'function'
      ? options.getDeckViewSharedOptions(doc)
      : {};
  }

  function resolveStudioEditorFallbackActiveSlideId(doc, canonicalDeck, options = {}) {
    const deckViewApi = resolveDeckViewApi(options);
    if (!deckViewApi || typeof deckViewApi.resolveStudioFallbackActiveSlideId !== 'function') {
      return '';
    }
    return deckViewApi.resolveStudioFallbackActiveSlideId(
      doc,
      canonicalDeck,
      getEditorDeckViewSharedOptions(doc, options)
    );
  }

  function resolveStudioEditorLiveActiveSlide(doc, options = {}) {
    const deckViewApi = resolveDeckViewApi(options);
    if (!deckViewApi || typeof deckViewApi.resolveStudioLiveActiveSlide !== 'function') {
      return null;
    }
    return deckViewApi.resolveStudioLiveActiveSlide(doc);
  }

  function resolveStudioEditorLiveActiveSlideId(doc, options = {}) {
    const deckViewApi = resolveDeckViewApi(options);
    if (!deckViewApi || typeof deckViewApi.resolveStudioLiveActiveSlideId !== 'function') {
      return '';
    }
    const getActiveSlideId = typeof options.getActiveSlideId === 'function'
      ? options.getActiveSlideId
      : () => '';
    return deckViewApi.resolveStudioLiveActiveSlideId(doc, { getActiveSlideId });
  }

  function createStudioEditorDeckRenderOptions(doc, canonicalDeck, options = {}) {
    const deckViewApi = resolveDeckViewApi(options);
    if (!deckViewApi || typeof deckViewApi.createStudioDeckRenderOptions !== 'function') {
      return null;
    }
    return deckViewApi.createStudioDeckRenderOptions(doc, canonicalDeck, {
      activeSlideId: options.activeSlideId,
      ...getEditorDeckViewSharedOptions(doc, options)
    });
  }

  return {
    createStudioEditorCanonicalDeckViewStateOptions,
    resolveStudioEditorCanonicalDeckViewState,
    resolveStudioEditorFallbackActiveSlideId,
    resolveStudioEditorLiveActiveSlide,
    resolveStudioEditorLiveActiveSlideId,
    createStudioEditorDeckRenderOptions
  };
});
