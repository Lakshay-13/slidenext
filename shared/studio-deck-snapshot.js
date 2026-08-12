(function (root, factory) {
  const deckModel = typeof module === 'object' && module.exports
    ? require('./deck-model')
    : root && root.SlideNextDeckModel;
  const loadDeckView = typeof module === 'object' && module.exports
    ? () => require('./studio-deck-view')
    : () => root && root.SlideNextStudioDeckView;
  const api = factory(deckModel, loadDeckView);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioDeckSnapshot = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (deckModel, loadDeckView) {
  function isCanonicalDeckLike(deck) {
    return !!deck && Array.isArray(deck.slides);
  }

  function resolveStudioDeckView() {
    return typeof loadDeckView === 'function'
      ? loadDeckView()
      : null;
  }

  function createStudioDeckSnapshotCanonicalDeckResolver(doc, options = {}) {
    const deckView = resolveStudioDeckView();
    if (deckView && typeof deckView.createStudioCanonicalDeckResolver === 'function') {
      return deckView.createStudioCanonicalDeckResolver(doc, {
        buildCanonicalDeck: options.buildCanonicalDeck
      });
    }

    const buildCanonicalDeck = typeof options.buildCanonicalDeck === 'function'
      ? options.buildCanonicalDeck
      : () => null;
    let didResolveCanonicalDeck = false;
    let resolvedCanonicalDeck = null;

    return function resolveCanonicalDeck(sourceDoc = doc) {
      if (!didResolveCanonicalDeck) {
        resolvedCanonicalDeck = buildCanonicalDeck(sourceDoc);
        didResolveCanonicalDeck = true;
      }
      return resolvedCanonicalDeck;
    };
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

  function resolveStudioDeckSnapshotCanonicalDeckViewState(doc, options = {}) {
    const deckView = resolveStudioDeckView();
    if (deckView && typeof deckView.resolveStudioCanonicalDeckViewState === 'function') {
      return deckView.resolveStudioCanonicalDeckViewState(doc, {
        buildCanonicalDeck: options.buildCanonicalDeck,
        resolveLiveActiveSlideId: options.resolveLiveActiveSlideId,
        resolveCanonicalDeck: options.resolveCanonicalDeck
      });
    }

    const rawCanonicalStateOptions = deckView
      && typeof deckView.createStudioDeckViewCanonicalStateOptions === 'function'
      ? deckView.createStudioDeckViewCanonicalStateOptions({
          buildCanonicalDeck: options.buildCanonicalDeck,
          resolveLiveActiveSlideId: options.resolveLiveActiveSlideId
        })
      : {
          buildCanonicalDeck: typeof options.buildCanonicalDeck === 'function'
            ? options.buildCanonicalDeck
            : () => null,
          resolveLiveActiveSlideId: typeof options.resolveLiveActiveSlideId === 'function'
            ? options.resolveLiveActiveSlideId
            : () => ''
        };
    const canonicalStateOptions = {
      buildCanonicalDeck: rawCanonicalStateOptions
        && typeof rawCanonicalStateOptions.buildCanonicalDeck === 'function'
        ? rawCanonicalStateOptions.buildCanonicalDeck
        : typeof options.buildCanonicalDeck === 'function'
          ? options.buildCanonicalDeck
          : () => null,
      resolveLiveActiveSlideId: rawCanonicalStateOptions
        && typeof rawCanonicalStateOptions.resolveLiveActiveSlideId === 'function'
        ? rawCanonicalStateOptions.resolveLiveActiveSlideId
        : typeof options.resolveLiveActiveSlideId === 'function'
          ? options.resolveLiveActiveSlideId
          : () => ''
    };
    const resolveCanonicalDeck = typeof options.resolveCanonicalDeck === 'function'
      ? options.resolveCanonicalDeck
      : createStudioDeckSnapshotCanonicalDeckResolver(doc, {
          buildCanonicalDeck: canonicalStateOptions.buildCanonicalDeck
        });
    const resolveLiveActiveSlideId = canonicalStateOptions.resolveLiveActiveSlideId;
    const liveActiveSlideId = resolveLiveActiveSlideId(doc);
    const resolvedCanonicalDeck = !doc
      ? resolveCanonicalDeck(doc)
      : (liveActiveSlideId ? null : resolveCanonicalDeck(doc));

    return {
      resolveCanonicalDeck,
      liveActiveSlideId,
      resolvedCanonicalDeck
    };
  }

  function resolveStudioDeckSnapshotLiveActiveSlide(doc, options = {}) {
    const deckView = resolveStudioDeckView();
    if (deckView && typeof deckView.resolveStudioLiveActiveSlide === 'function') {
      return deckView.resolveStudioLiveActiveSlide(doc, {
        querySelector: options.querySelector
      });
    }

    const querySelector = typeof options.querySelector === 'function'
      ? options.querySelector
      : (sourceDoc, selector) => sourceDoc && typeof sourceDoc.querySelector === 'function'
          ? sourceDoc.querySelector(selector)
          : null;
    return querySelector(doc, '.slide-active') || null;
  }

  function createStudioDeckSnapshotBuildOptions(doc, options = {}) {
    const resolveCanonicalDeckViewState = typeof options.resolveCanonicalDeckViewState === 'function'
      ? options.resolveCanonicalDeckViewState
      : (nextDoc) => resolveStudioDeckSnapshotCanonicalDeckViewState(nextDoc, options);
    const resolveFallbackActiveSlideId = typeof options.resolveFallbackActiveSlideId === 'function'
      ? options.resolveFallbackActiveSlideId
      : () => '';
    const resolveLiveActiveSlide = typeof options.resolveLiveActiveSlide === 'function'
      ? options.resolveLiveActiveSlide
      : (nextDoc) => resolveStudioDeckSnapshotLiveActiveSlide(nextDoc, options);
    const canonicalDeckViewState = resolveCanonicalDeckViewState(doc);
    const resolveCanonicalDeck = canonicalDeckViewState && typeof canonicalDeckViewState.resolveCanonicalDeck === 'function'
      ? canonicalDeckViewState.resolveCanonicalDeck
      : () => null;
    const liveActiveSlideId = canonicalDeckViewState && typeof canonicalDeckViewState.liveActiveSlideId === 'string'
      ? canonicalDeckViewState.liveActiveSlideId
      : '';
    const resolvedCanonicalDeck = canonicalDeckViewState
      ? canonicalDeckViewState.resolvedCanonicalDeck || null
      : null;
    const liveActiveSlide = liveActiveSlideId ? resolveLiveActiveSlide(doc) : null;

    return {
      buildCanonicalDeck: doc
        ? (resolvedCanonicalDeck ? () => resolvedCanonicalDeck : resolveCanonicalDeck)
        : () => resolvedCanonicalDeck,
      fallbackActiveSlideId: liveActiveSlideId || resolveFallbackActiveSlideId(doc, resolvedCanonicalDeck),
      getActiveSlide: () => liveActiveSlide,
      liveActiveSlideId,
      resolvedCanonicalDeck
    };
  }

  function createStudioDeckSnapshotBuilder(options = {}) {
    const getDocument = typeof options.getDocument === 'function'
      ? options.getDocument
      : () => null;
    const createDeckViewStateOptions = typeof options.createDeckViewStateOptions === 'function'
      ? options.createDeckViewStateOptions
      : () => ({});
    const resolveCanonicalDeckViewState = typeof options.resolveCanonicalDeckViewState === 'function'
      ? options.resolveCanonicalDeckViewState
      : null;
    const resolveFallbackActiveSlideId = typeof options.resolveFallbackActiveSlideId === 'function'
      ? options.resolveFallbackActiveSlideId
      : () => '';
    const resolveLiveActiveSlide = typeof options.resolveLiveActiveSlide === 'function'
      ? options.resolveLiveActiveSlide
      : undefined;
    const buildDeckSnapshot = typeof options.buildDeckSnapshot === 'function'
      ? options.buildDeckSnapshot
      : buildStudioDeckSnapshot;
    const buildDomSnapshot = typeof options.buildDomSnapshot === 'function'
      ? options.buildDomSnapshot
      : buildStudioDeckSnapshotFromDom;

    return function buildDeckSnapshotForDocument(doc = getDocument(), buildOptions = {}) {
      const deckViewStateOptions = createDeckViewStateOptions(doc, buildOptions);
      const snapshotBuildOptions = createStudioDeckSnapshotBuildOptions(doc, {
        ...deckViewStateOptions,
        ...(resolveCanonicalDeckViewState
          ? {
              resolveCanonicalDeckViewState: (nextDoc) => resolveCanonicalDeckViewState(nextDoc, buildOptions)
            }
          : {}),
        resolveFallbackActiveSlideId: (nextDoc, canonicalDeck) => resolveFallbackActiveSlideId(
          nextDoc,
          canonicalDeck,
          buildOptions
        ),
        ...(typeof resolveLiveActiveSlide === 'function'
          ? {
              resolveLiveActiveSlide: (nextDoc) => resolveLiveActiveSlide(nextDoc, buildOptions)
            }
          : {})
      });

      return buildDeckSnapshot(doc, {
        includeLayers: !!buildOptions.includeLayers,
        ...(buildOptions.preferCanonicalLayers
          ? { preferCanonicalLayers: true }
          : {}),
        ...(buildOptions.canonicalLayerOptions
          ? { canonicalLayerOptions: buildOptions.canonicalLayerOptions }
          : {}),
        ...snapshotBuildOptions,
        buildDomSnapshot: (sourceDoc) => buildDomSnapshot(sourceDoc, buildOptions),
        getActiveSlideId: options.getActiveSlideId,
        getSlideById: options.getSlideById,
        buildSlideLayerSnapshot: options.buildSlideLayerSnapshot
      });
    };
  }

  function buildStudioDeckSnapshot(doc, options = {}) {
    const buildCanonicalDeck = typeof options.buildCanonicalDeck === 'function'
      ? options.buildCanonicalDeck
      : null;
    const buildDomSnapshot = typeof options.buildDomSnapshot === 'function'
      ? options.buildDomSnapshot
      : (sourceDoc) => buildStudioDeckSnapshotFromDom(sourceDoc, options.domSnapshotOptions || options);
    let canonicalDeck = null;
    if (buildCanonicalDeck) {
      try {
        canonicalDeck = buildCanonicalDeck(doc);
      } catch (err) {
        canonicalDeck = null;
      }
    }

    if (!isCanonicalDeckLike(canonicalDeck) || !deckModel || typeof deckModel.buildDeckSnapshotFromCanonicalDeck !== 'function') {
      return buildDomSnapshot(doc);
    }

    const activeSlide = typeof options.getActiveSlide === 'function'
      ? options.getActiveSlide(doc)
      : null;
    const fallbackActiveSlideId = typeof options.fallbackActiveSlideId === 'string'
      ? options.fallbackActiveSlideId
      : '';
    const activeSlideId = activeSlide && typeof options.getActiveSlideId === 'function'
      ? (options.getActiveSlideId(activeSlide, doc) || fallbackActiveSlideId)
      : fallbackActiveSlideId;
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
        if (options.preferCanonicalLayers || !slideEl || !buildSlideLayerSnapshot) {
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
    createStudioDeckSnapshotCanonicalDeckResolver,
    buildStudioDeckSnapshotFromDom,
    createStudioDeckSnapshotBuildOptions,
    createStudioDeckSnapshotBuilder,
    buildStudioDeckSnapshot,
    resolveStudioActiveSlideIndex
  };
});
