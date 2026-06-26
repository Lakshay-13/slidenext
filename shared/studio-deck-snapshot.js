(function (root, factory) {
  const deckModel = typeof module === 'object' && module.exports
    ? require('./deck-model')
    : root && root.SlideNextDeckModel;
  const api = factory(deckModel);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioDeckSnapshot = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (deckModel) {
  function isCanonicalDeckLike(deck) {
    return !!deck && Array.isArray(deck.slides);
  }

  function buildStudioDeckSnapshotFromDom(doc, options = {}) {
    if (!deckModel || typeof deckModel.buildDeckSnapshot !== 'function') {
      return {
        activeSlideId: '',
        activeSlideIndex: -1,
        slides: []
      };
    }

    return deckModel.buildDeckSnapshot(doc, {
      includeLayers: !!options.includeLayers,
      getSlides: options.getSlides,
      getActiveSlide: options.getActiveSlide,
      getSlideId: options.getSlideId,
      getSlideEditableElements: options.getSlideEditableElements,
      getNormalizedSlideLayerOrder: options.getNormalizedSlideLayerOrder,
      elementSnapshotOptions: options.elementSnapshotOptions
    });
  }

  function buildStudioDeckSnapshot(doc, options = {}) {
    const buildCanonicalDeck = typeof options.buildCanonicalDeck === 'function'
      ? options.buildCanonicalDeck
      : null;
    const buildDomSnapshot = typeof options.buildDomSnapshot === 'function'
      ? options.buildDomSnapshot
      : (sourceDoc) => buildStudioDeckSnapshotFromDom(sourceDoc, options.domSnapshotOptions || options);
    const canonicalDeck = buildCanonicalDeck ? buildCanonicalDeck(doc) : null;

    if (!isCanonicalDeckLike(canonicalDeck) || !deckModel || typeof deckModel.buildDeckSnapshotFromCanonicalDeck !== 'function') {
      return buildDomSnapshot(doc);
    }

    const activeSlide = typeof options.getActiveSlide === 'function'
      ? options.getActiveSlide(doc)
      : null;
    const activeSlideId = activeSlide && typeof options.getActiveSlideId === 'function'
      ? options.getActiveSlideId(activeSlide, doc)
      : '';
    const deckSnapshot = deckModel.buildDeckSnapshotFromCanonicalDeck(canonicalDeck, {
      activeSlideId,
      includeLayers: !!options.includeLayers,
      canonicalLayerOptions: options.canonicalLayerOptions || options
    });

    if (!options.includeLayers) {
      return deckSnapshot;
    }

    const getSlideById = typeof options.getSlideById === 'function'
      ? options.getSlideById
      : null;
    const buildSlideLayerSnapshot = typeof options.buildSlideLayerSnapshot === 'function'
      ? options.buildSlideLayerSnapshot
      : null;

    return {
      ...deckSnapshot,
      slides: deckSnapshot.slides.map((slideSnapshot) => {
        const slideEl = getSlideById ? getSlideById(slideSnapshot.id, doc) : null;
        if (!slideEl || !buildSlideLayerSnapshot) {
          return slideSnapshot;
        }
        return {
          ...slideSnapshot,
          elements: buildSlideLayerSnapshot(slideEl, slideSnapshot, doc)
        };
      })
    };
  }

  function resolveStudioActiveSlideIndex(deckSnapshot, fallbackIndex = 0) {
    if (deckSnapshot && deckSnapshot.activeSlideIndex >= 0) {
      return deckSnapshot.activeSlideIndex;
    }
    const slideCount = deckSnapshot && Array.isArray(deckSnapshot.slides)
      ? deckSnapshot.slides.length
      : 0;
    if (slideCount === 0) return 0;
    return Math.max(0, Math.min(fallbackIndex, slideCount - 1));
  }

  return {
    isCanonicalDeckLike,
    buildStudioDeckSnapshotFromDom,
    buildStudioDeckSnapshot,
    resolveStudioActiveSlideIndex
  };
});
