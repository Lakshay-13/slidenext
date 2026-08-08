(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorWallpaperMutation = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function applyStudioWallpaperSlidesMutationWithTransaction(slides, background, options = {}) {
    const sourceSlides = Array.isArray(slides) ? slides : [];
    if (sourceSlides.length === 0) {
      return {
        didChange: false,
        transaction: null
      };
    }

    const createStyleTransaction = typeof options.createStyleTransaction === 'function'
      ? options.createStyleTransaction
      : null;
    const applyStudioWallpaperToSlides = typeof options.applyStudioWallpaperToSlides === 'function'
      ? options.applyStudioWallpaperToSlides
      : null;
    const getSlideId = typeof options.getSlideId === 'function'
      ? options.getSlideId
      : (slide) => slide && slide.dataset && slide.dataset.slideId;
    const canonicalDeckApi = options.canonicalDeckApi && typeof options.canonicalDeckApi === 'object'
      ? options.canonicalDeckApi
      : null;
    const canonicalWallpaperApi = options.canonicalWallpaperApi
      && typeof options.canonicalWallpaperApi === 'object'
      ? options.canonicalWallpaperApi
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
    const canonicalWallpaperBuilders = canonicalWallpaperApi
      && typeof canonicalWallpaperApi.createStudioCanonicalWallpaperMutationBuilders === 'function'
      ? canonicalWallpaperApi.createStudioCanonicalWallpaperMutationBuilders({
          canonicalDeckApi,
          buildCanonicalDeck,
          buildCanonicalDeckBaseline,
          getCanonicalDeckBaseline
        })
      : null;
    const buildCanonicalWallpaperDeck = canonicalWallpaperBuilders
      && typeof canonicalWallpaperBuilders.buildCanonicalWallpaperDeck === 'function'
      ? canonicalWallpaperBuilders.buildCanonicalWallpaperDeck
      : null;
    const canonicalDeckBeforeMutation = canonicalWallpaperBuilders
      && typeof canonicalWallpaperBuilders.buildCanonicalWallpaperBaseline === 'function'
      ? canonicalWallpaperBuilders.buildCanonicalWallpaperBaseline({
          sourceDocument: options.sourceDocument
        })
      : null;
    const canonicalDeck = buildCanonicalWallpaperDeck
      ? buildCanonicalWallpaperDeck(sourceSlides, background, {
          ...(canonicalDeckBeforeMutation
            ? { canonicalDeckBeforeMutation }
            : {}),
          getSlideId
        })
      : null;

    if (!applyStudioWallpaperToSlides) {
      return {
        didChange: false,
        transaction: null
      };
    }

    const mutation = applyStudioWallpaperToSlides(sourceSlides, background, {
      createStyleTransaction,
      getSlideId
    });
    return mutation && typeof mutation === 'object'
      ? {
          didChange: !!mutation.didChange,
          transaction: mutation.transaction || null,
          ...(mutation.didChange && canonicalDeck ? { canonicalDeck } : {})
        }
      : {
          didChange: false,
          transaction: null
        };
  }

  return {
    applyStudioWallpaperSlidesMutationWithTransaction
  };
});
