(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorCanonicalWallpaper = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
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
    const canonicalDeckBeforeMutation = buildCanonicalDeck
      ? buildCanonicalDeck()
      : null;
    return updateCanonicalSlideBackground(canonicalDeckBeforeMutation, slideIds, background);
  }

  return {
    buildStudioCanonicalWallpaperDeck
  };
});
