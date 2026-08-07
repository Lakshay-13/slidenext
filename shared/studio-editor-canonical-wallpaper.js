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
    const buildCanonicalDeck = typeof options.buildCanonicalDeck === 'function'
      ? options.buildCanonicalDeck
      : null;

    if (!updateCanonicalSlideBackground || !buildCanonicalDeck) {
      return null;
    }

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
    const buildCanonicalWallpaperBaseline = (baselineOptions = {}) => (
      buildStudioCanonicalWallpaperBaseline({
        ...baselineOptions,
        canonicalDeckApi,
        buildCanonicalDeck
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
