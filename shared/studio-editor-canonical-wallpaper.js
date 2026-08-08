(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorCanonicalWallpaper = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function buildStudioCanonicalWallpaperBaseline(options = {}) {
    const canonicalDeckApi = options.canonicalDeckApi && typeof options.canonicalDeckApi === 'object'
      ? options.canonicalDeckApi
      : null;
    const updateCanonicalSlideBackground = canonicalDeckApi
      && typeof canonicalDeckApi.updateCanonicalSlideBackground === 'function'
      ? canonicalDeckApi.updateCanonicalSlideBackground
      : null;
    const getCanonicalDeckBaseline = typeof options.getCanonicalDeckBaseline === 'function'
      ? options.getCanonicalDeckBaseline
      : null;
    const buildCanonicalDeck = typeof options.buildCanonicalDeckBaseline === 'function'
      ? options.buildCanonicalDeckBaseline
      : typeof options.buildCanonicalDeck === 'function'
        ? options.buildCanonicalDeck
        : null;

    if (!updateCanonicalSlideBackground) return null;

    if (getCanonicalDeckBaseline) {
      let liveCanonicalDeck = null;
      try {
        liveCanonicalDeck = getCanonicalDeckBaseline(options.sourceDocument);
      } catch (err) {
        liveCanonicalDeck = null;
      }
      if (typeof canonicalDeckApi.isCanonicalDeck !== 'function'
        || canonicalDeckApi.isCanonicalDeck(liveCanonicalDeck)) {
        if (liveCanonicalDeck) return liveCanonicalDeck;
      }
    }

    if (!buildCanonicalDeck) return null;

    return buildCanonicalDeck(options.sourceDocument);
  }

  function buildStudioCanonicalWallpaperDeck(slides, background, options = {}) {
    const sourceSlides = Array.isArray(slides) ? slides : [];
    const canonicalDeckApi = options.canonicalDeckApi && typeof options.canonicalDeckApi === 'object'
      ? options.canonicalDeckApi
      : null;
    const updateCanonicalSlideBackground = canonicalDeckApi
      && typeof canonicalDeckApi.updateCanonicalSlideBackground === 'function'
      ? canonicalDeckApi.updateCanonicalSlideBackground
      : null;
    const buildCanonicalDeck = typeof options.buildCanonicalDeck === 'function'
      ? options.buildCanonicalDeck
      : null;
    const buildCanonicalDeckBaseline = typeof options.buildCanonicalDeckBaseline === 'function'
      ? options.buildCanonicalDeckBaseline
      : null;
    const getSlideId = typeof options.getSlideId === 'function'
      ? options.getSlideId
      : (slide) => slide && typeof slide.id === 'string' ? slide.id : '';

    if (!updateCanonicalSlideBackground || sourceSlides.length === 0) {
      return null;
    }

    const slideIds = sourceSlides.map(getSlideId).filter(Boolean);
    const canonicalDeckBeforeMutation = Object.prototype.hasOwnProperty.call(options, 'canonicalDeckBeforeMutation')
      ? options.canonicalDeckBeforeMutation
      : buildStudioCanonicalWallpaperBaseline(options);
    return updateCanonicalSlideBackground(canonicalDeckBeforeMutation, slideIds, background);
  }

  function createStudioCanonicalWallpaperMutationBuilders(options = {}) {
    const canonicalDeckApi = options.canonicalDeckApi && typeof options.canonicalDeckApi === 'object'
      ? options.canonicalDeckApi
      : null;
    const buildCanonicalDeck = typeof options.buildCanonicalDeck === 'function'
      ? options.buildCanonicalDeck
      : null;
    const buildCanonicalDeckBaseline = typeof options.buildCanonicalDeckBaseline === 'function'
      ? options.buildCanonicalDeckBaseline
      : null;
    const getCanonicalDeckBaseline = typeof options.getCanonicalDeckBaseline === 'function'
      ? options.getCanonicalDeckBaseline
      : null;
    const buildCanonicalWallpaperBaseline = (baselineOptions = {}) => (
      buildStudioCanonicalWallpaperBaseline({
        ...baselineOptions,
        canonicalDeckApi,
        buildCanonicalDeck,
        buildCanonicalDeckBaseline,
        getCanonicalDeckBaseline
      })
    );
    const buildCanonicalWallpaperDeck = (slides, background, deckOptions = {}) => {
      const canonicalDeckBeforeMutation = Object.prototype.hasOwnProperty.call(
        deckOptions,
        'canonicalDeckBeforeMutation'
      )
        ? deckOptions.canonicalDeckBeforeMutation
        : buildCanonicalWallpaperBaseline(deckOptions);
      return buildStudioCanonicalWallpaperDeck(slides, background, {
        ...deckOptions,
        canonicalDeckApi,
        buildCanonicalDeck,
        buildCanonicalDeckBaseline,
        canonicalDeckBeforeMutation
      });
    };

    return {
      buildCanonicalWallpaperBaseline,
      buildCanonicalWallpaperDeck
    };
  }

  return {
    buildStudioCanonicalWallpaperBaseline,
    buildStudioCanonicalWallpaperDeck,
    createStudioCanonicalWallpaperMutationBuilders
  };
});
