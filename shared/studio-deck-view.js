(function (root, factory) {
  const deckHtml = typeof module === 'object' && module.exports
    ? require('./deck-html')
    : root && root.SlideNextDeckHtml;
  const historyResultApi = typeof module === 'object' && module.exports
    ? require('./studio-editor-history-result.js')
    : root && root.SlideNextStudioEditorHistoryResult;
  const api = factory(deckHtml, historyResultApi);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioDeckView = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (deckHtml, historyResultApi) {
  const ACTIVE_THUMBNAIL_CARD_CLASS_NAME = 'glass-card p-3 border cursor-pointer relative group flex items-start gap-3 select-none transition-all border-[#7028d0] bg-[#7028d0]/5 shadow-[0_0_15px_rgba(112,40,208,0.1)]';
  const INACTIVE_THUMBNAIL_CARD_CLASS_NAME = 'glass-card p-3 border cursor-pointer relative group flex items-start gap-3 select-none transition-all border-white/5 bg-[#0a0a0a]/40 hover:border-white/20';

  function isCanonicalDeckLike(deck) {
    return !!deck && Array.isArray(deck.slides);
  }

  const isStudioHistoryCaptureFailure = historyResultApi
    && typeof historyResultApi.isStudioHistoryCaptureFailure === 'function'
    ? historyResultApi.isStudioHistoryCaptureFailure
    : (value) => value === false
      || (!!value && typeof value === 'object' && value.didCapture === false);
  const captureStudioHistoryState = historyResultApi
    && typeof historyResultApi.captureStudioHistoryState === 'function'
    ? historyResultApi.captureStudioHistoryState
    : (saveHistoryState, ...args) => {
        if (typeof saveHistoryState !== 'function') return false;
        try {
          return saveHistoryState(...args);
        } catch (error) {
          return false;
        }
      };

  function createStudioCanonicalDeckResolver(doc, options = {}) {
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

  function createStudioDeckViewCanonicalStateOptions(options = {}) {
    return {
      buildCanonicalDeck: typeof options.buildCanonicalDeck === 'function'
        ? options.buildCanonicalDeck
        : () => null,
      getPendingCanonicalDeck: typeof options.getPendingCanonicalDeck === 'function'
        ? options.getPendingCanonicalDeck
        : null,
      resolveLiveActiveSlideId: typeof options.resolveLiveActiveSlideId === 'function'
        ? options.resolveLiveActiveSlideId
        : () => ''
    };
  }

  function resolveStudioCanonicalDeckViewState(doc, options = {}) {
    const canonicalStateOptions = createStudioDeckViewCanonicalStateOptions(options);
    const resolveCanonicalDeck = typeof options.resolveCanonicalDeck === 'function'
      ? options.resolveCanonicalDeck
      : createStudioCanonicalDeckResolver(doc, {
          buildCanonicalDeck: canonicalStateOptions.buildCanonicalDeck
        });
    const resolveLiveCanonicalDeck = typeof options.resolveLiveCanonicalDeck === 'function'
      ? options.resolveLiveCanonicalDeck
      : null;
    const getPendingCanonicalDeck = typeof options.getPendingCanonicalDeck === 'function'
      ? options.getPendingCanonicalDeck
      : null;
    const resolveLiveActiveSlideId = canonicalStateOptions.resolveLiveActiveSlideId;
    const liveActiveSlideId = resolveLiveActiveSlideId(doc);
    let pendingCanonicalDeck = null;
    if (getPendingCanonicalDeck) {
      try {
        const candidate = getPendingCanonicalDeck(doc);
        if (isCanonicalDeckLike(candidate)) pendingCanonicalDeck = candidate;
      } catch (error) {
        // Continue through live and rebuilt canonical state.
      }
    }
    const resolvedCanonicalDeck = pendingCanonicalDeck || (!doc
      ? resolveCanonicalDeck(doc)
      : (liveActiveSlideId
        ? (resolveLiveCanonicalDeck ? resolveLiveCanonicalDeck(doc) : null)
        : resolveCanonicalDeck(doc)));
    const canonicalDeckResolver = pendingCanonicalDeck
      ? () => pendingCanonicalDeck
      : liveActiveSlideId
      && resolveLiveCanonicalDeck
      && resolvedCanonicalDeck
      ? () => resolvedCanonicalDeck
      : resolveCanonicalDeck;

    return {
      resolveCanonicalDeck: canonicalDeckResolver,
      liveActiveSlideId,
      resolvedCanonicalDeck
    };
  }

  function createStudioDeckViewBuildOptions(doc, options = {}) {
    const canonicalDeckViewState = typeof options.resolveCanonicalDeckViewState === 'function'
      ? options.resolveCanonicalDeckViewState(doc)
        : resolveStudioCanonicalDeckViewState(doc, {
          buildCanonicalDeck: options.buildCanonicalDeck,
          getPendingCanonicalDeck: options.getPendingCanonicalDeck,
          resolveLiveActiveSlideId: options.resolveLiveActiveSlideId,
          resolveCanonicalDeck: options.resolveCanonicalDeck
        });
    const resolveCanonicalDeck = canonicalDeckViewState && typeof canonicalDeckViewState.resolveCanonicalDeck === 'function'
      ? canonicalDeckViewState.resolveCanonicalDeck
      : () => null;
    const liveActiveSlideId = canonicalDeckViewState && typeof canonicalDeckViewState.liveActiveSlideId === 'string'
      ? canonicalDeckViewState.liveActiveSlideId
      : '';
    const resolvedCanonicalDeck = canonicalDeckViewState
      ? canonicalDeckViewState.resolvedCanonicalDeck || null
      : null;
    const buildFallbackHtml = typeof options.buildFallbackHtml === 'function'
      ? options.buildFallbackHtml
      : () => '';
    const buildRenderOptions = typeof options.buildRenderOptions === 'function'
      ? options.buildRenderOptions
      : () => ({});
    const deckHtmlOptions = options.deckHtmlOptions && typeof options.deckHtmlOptions === 'object'
      ? { ...options.deckHtmlOptions }
      : {};
    const explicitActiveSlideId = typeof options.activeSlideId === 'string' && options.activeSlideId.trim()
      ? options.activeSlideId
      : '';

    return {
      buildCanonicalDeck: resolveCanonicalDeck,
      buildFallbackHtml: (sourceDoc) => buildFallbackHtml(
        sourceDoc,
        doc ? resolveCanonicalDeck(sourceDoc) : resolvedCanonicalDeck
      ),
      deckHtmlOptions: {
        ...deckHtmlOptions,
        renderOptions: {
          ...(deckHtmlOptions.renderOptions && typeof deckHtmlOptions.renderOptions === 'object'
            ? deckHtmlOptions.renderOptions
            : {}),
          ...buildRenderOptions(doc, resolvedCanonicalDeck, {
            activeSlideId: explicitActiveSlideId || liveActiveSlideId
          })
        }
      }
    };
  }

  function createStudioDeckViewBuildViewOptionsResolver(options = {}) {
    const buildViewOptions = typeof options.buildViewOptions === 'function'
      ? options.buildViewOptions
      : typeof options.createBuildOptions === 'function'
        ? options.createBuildOptions
        : () => ({});
    const extendViewOptions = typeof options.extendViewOptions === 'function'
      ? options.extendViewOptions
      : (deckViewOptions) => deckViewOptions;
    const getDocument = typeof options.getDocument === 'function'
      ? options.getDocument
      : () => null;

    return function resolveViewOptions(sourceDoc = getDocument()) {
      return extendViewOptions(buildViewOptions(sourceDoc), sourceDoc);
    };
  }

  function createStudioDeckViewCanonicalHtmlResolver(options = {}) {
    const buildCanonicalHtml = typeof options.buildCanonicalHtml === 'function'
      ? options.buildCanonicalHtml
      : null;
    const mapCanonicalHtmlArgs = typeof options.mapCanonicalHtmlArgs === 'function'
      ? options.mapCanonicalHtmlArgs
      : (canonicalDeck, deckHtmlOptions) => [canonicalDeck, deckHtmlOptions];

    return buildCanonicalHtml
      ? (canonicalDeck, deckHtmlOptions) => buildCanonicalHtml(
          ...mapCanonicalHtmlArgs(canonicalDeck, deckHtmlOptions)
        )
      : null;
  }

  function createStudioDeckViewHtmlOptions(options = {}) {
    const buildSharedHtml = typeof options.buildSharedHtml === 'function'
      ? options.buildSharedHtml
      : null;
    const buildViewOptions = typeof options.buildViewOptions === 'function'
      ? options.buildViewOptions
      : null;
    const extendViewOptions = typeof options.extendViewOptions === 'function'
      ? options.extendViewOptions
      : null;
    const buildCanonicalHtml = typeof options.buildCanonicalHtml === 'function'
      ? options.buildCanonicalHtml
      : null;
    const mapCanonicalHtmlArgs = typeof options.mapCanonicalHtmlArgs === 'function'
      ? options.mapCanonicalHtmlArgs
      : null;
    const transformFallbackHtml = typeof options.transformFallbackHtml === 'function'
      ? options.transformFallbackHtml
      : null;
    const createBuildViewOptionsResolver = typeof options.createBuildViewOptionsResolver === 'function'
      ? options.createBuildViewOptionsResolver
      : null;
    const createCanonicalHtmlResolver = typeof options.createCanonicalHtmlResolver === 'function'
      ? options.createCanonicalHtmlResolver
      : null;
    const createBuildOptions = typeof options.createBuildOptions === 'function'
      ? options.createBuildOptions
      : () => ({});
    const resolvedBuildViewOptions = createBuildViewOptionsResolver
      ? createBuildViewOptionsResolver({
          buildViewOptions,
          extendViewOptions,
          createBuildOptions,
          getDocument: options.getDocument
        })
      : null;
    const resolvedCanonicalHtml = createCanonicalHtmlResolver
      ? createCanonicalHtmlResolver({
          buildCanonicalHtml,
          mapCanonicalHtmlArgs
        })
      : null;

    return {
      buildSharedHtml,
      buildViewOptions: typeof resolvedBuildViewOptions === 'function'
        ? resolvedBuildViewOptions
        : buildViewOptions
          ? extendViewOptions
            ? (sourceDoc) => extendViewOptions(buildViewOptions(sourceDoc), sourceDoc)
            : buildViewOptions
          : extendViewOptions
            ? (sourceDoc) => extendViewOptions(createBuildOptions(sourceDoc), sourceDoc)
            : (sourceDoc) => createBuildOptions(sourceDoc),
      buildCanonicalHtml: typeof resolvedCanonicalHtml === 'function'
        ? resolvedCanonicalHtml
        : buildCanonicalHtml
          ? (canonicalDeck, deckHtmlOptions) => buildCanonicalHtml(...(
              typeof mapCanonicalHtmlArgs === 'function'
                ? mapCanonicalHtmlArgs(canonicalDeck, deckHtmlOptions)
                : [canonicalDeck, deckHtmlOptions]
            ))
          : null,
      transformFallbackHtml
    };
  }

  function createStudioDeckRenderOptions(doc, canonicalDeck = null, options = {}) {
    const explicitActiveSlideId = typeof options.activeSlideId === 'string' && options.activeSlideId.trim()
      ? options.activeSlideId
      : '';
    const resolveFallbackActiveSlideId = typeof options.resolveFallbackActiveSlideId === 'function'
      ? options.resolveFallbackActiveSlideId
      : (nextDoc, nextCanonicalDeck) => resolveStudioFallbackActiveSlideId(
          nextDoc,
          nextCanonicalDeck,
          options
        );

    return {
      activeSlideId: explicitActiveSlideId || resolveFallbackActiveSlideId(doc, canonicalDeck),
      preferSourceHtml: false,
      preferHeadSourceHtml: false,
      preferBodySourceHtml: false,
      preferSlideSourceHtml: false,
      preferNodeSourceHtml: false
    };
  }

  function createStudioDeckViewSharedOptions(doc, options = {}) {
    const buildCanonicalDeck = typeof options.buildCanonicalDeck === 'function'
      ? options.buildCanonicalDeck
      : () => null;
    const resolveCanonicalDeckOverride = typeof options.resolveCanonicalDeckOverride === 'function'
      ? options.resolveCanonicalDeckOverride
      : (canonicalDeck) => canonicalDeck;
    const resolveLiveActiveSlideId = typeof options.resolveLiveActiveSlideId === 'function'
      ? options.resolveLiveActiveSlideId
      : () => '';
    const getPersistedActiveSlideId = typeof options.getPersistedActiveSlideId === 'function'
      ? options.getPersistedActiveSlideId
      : () => '';
    const isCanonicalDeck = typeof options.isCanonicalDeck === 'function'
      ? options.isCanonicalDeck
      : isCanonicalDeckLike;

    return {
      currentSlideIndex: Number.isInteger(options.currentSlideIndex) ? options.currentSlideIndex : 0,
      getPersistedActiveSlideId,
      resolveCanonicalDeck: buildCanonicalDeck,
      resolveCanonicalDeckOverride: (canonicalDeck = null, nextDoc = doc) => resolveCanonicalDeckOverride(
        canonicalDeck,
        {
          buildCanonicalDeck: canonicalDeck
            ? () => buildCanonicalDeck(nextDoc)
            : null
        }
      ),
      resolveLiveActiveSlideId,
      isCanonicalDeck
    };
  }

  function resolveStudioZoomActionState(doc, options = {}) {
    const getActiveSlide = typeof options.getActiveSlide === 'function'
      ? options.getActiveSlide
      : () => null;

    return {
      canUseZoomControls: !!getActiveSlide(doc)
    };
  }

  function renderStudioZoomToolbarActionState(options = {}) {
    const documentRef = options.documentRef;
    if (!documentRef || typeof documentRef.getElementById !== 'function') return false;
    const canUseZoomControls = !!options.canUseZoomControls;
    ['zoomOutBtn', 'zoomSelect', 'zoomInBtn'].forEach((id) => {
      const control = documentRef.getElementById(id);
      if (control) control.disabled = !canUseZoomControls;
    });
    return true;
  }

  function syncStudioZoomToolbarActionState(options = {}) {
    const actionState = options.actionState || resolveStudioZoomActionState(options.doc, {
      getActiveSlide: options.getActiveSlide
    });
    return renderStudioZoomToolbarActionState({
      documentRef: options.documentRef,
      ...actionState
    });
  }

  function createStudioZoomToolbarActionStateSync(options = {}) {
    const getDocument = typeof options.getDocument === 'function'
      ? options.getDocument
      : () => null;
    const getActionState = typeof options.getActionState === 'function'
      ? options.getActionState
      : (doc) => resolveStudioZoomActionState(doc, {
          getActiveSlide: options.getActiveSlide
        });
    const getDocumentRef = typeof options.getDocumentRef === 'function'
      ? options.getDocumentRef
      : () => options.documentRef || null;

    return function syncStudioEditorZoomToolbarActionState(doc = null) {
      const resolvedDoc = doc || getDocument();
      try {
        const actionState = getActionState(resolvedDoc) || {};
        return renderStudioZoomToolbarActionState({
          documentRef: getDocumentRef(),
          ...actionState
        });
      } catch (error) {
        return false;
      }
    };
  }

  function resolveStudioInsertionActionState(doc, options = {}) {
    const getActiveSlide = typeof options.getActiveSlide === 'function'
      ? options.getActiveSlide
      : () => null;
    const getSlideContainer = typeof options.getSlideContainer === 'function'
      ? options.getSlideContainer
      : () => null;
    const slideContainer = getSlideContainer(doc);

    return {
      canAddSlide: !!slideContainer,
      canDuplicateSlide: !!slideContainer && !!getActiveSlide(doc),
      canInsertElements: !!getActiveSlide(doc)
    };
  }

  function renderStudioInsertionToolbarActionState(options = {}) {
    const documentRef = options.documentRef;
    if (!documentRef || typeof documentRef.getElementById !== 'function') return false;
    const addSlideButton = documentRef.getElementById('addSlideBtn');
    if (addSlideButton) addSlideButton.disabled = !options.canAddSlide;
    const duplicateSlideButton = documentRef.getElementById('duplicateSlideBtn');
    if (duplicateSlideButton) duplicateSlideButton.disabled = !options.canDuplicateSlide;
    [
      'toolbarInsertHeadingBtn',
      'toolbarInsertParagraphBtn',
      'toolbarInsertImageBtn',
      'toolbarInsertShapeBtn',
      'insertHeadingBtn',
      'insertParagraphBtn',
      'insertImageBtn',
      'insertIconBtn',
      'insertShapeBtn',
      'insertTableBtn',
      'insertCodeBtn',
      'insertEmbedBtn',
      'insertChartBtn'
    ].forEach((id) => {
      const control = documentRef.getElementById(id);
      if (control) control.disabled = !options.canInsertElements;
    });
    return true;
  }

  function bindStudioEditorSlideInsertionControls(options = {}) {
    const documentRef = options.documentRef;
    if (!documentRef || typeof documentRef.getElementById !== 'function') return {};

    const addSlideNode = typeof options.addSlideNode === 'function'
      ? options.addSlideNode
      : null;
    const duplicateSlideNode = typeof options.duplicateSlideNode === 'function'
      ? options.duplicateSlideNode
      : null;
    const bindings = {};
    [
      ['addSlideBtn', addSlideNode],
      ['duplicateSlideBtn', duplicateSlideNode]
    ].forEach(([id, handler]) => {
      const button = documentRef.getElementById(id);
      if (!button || typeof button.addEventListener !== 'function') {
        bindings[id] = false;
        return;
      }
      button.addEventListener('click', () => {
        if (handler) handler();
      });
      bindings[id] = true;
    });
    return bindings;
  }

  function syncStudioInsertionToolbarActionState(options = {}) {
    const actionState = options.actionState || resolveStudioInsertionActionState(options.doc, {
      getActiveSlide: options.getActiveSlide,
      getSlideContainer: options.getSlideContainer
    });
    return renderStudioInsertionToolbarActionState({
      documentRef: options.documentRef,
      ...actionState
    });
  }

  function createStudioInsertionToolbarActionStateSync(options = {}) {
    const getDocument = typeof options.getDocument === 'function'
      ? options.getDocument
      : () => null;
    const getActionState = typeof options.getActionState === 'function'
      ? options.getActionState
      : (doc) => resolveStudioInsertionActionState(doc, {
          getActiveSlide: options.getActiveSlide,
          getSlideContainer: options.getSlideContainer
        });
    const getDocumentRef = typeof options.getDocumentRef === 'function'
      ? options.getDocumentRef
      : () => options.documentRef || null;

    return function syncStudioEditorInsertionToolbarActionState(doc = null) {
      const resolvedDoc = doc || getDocument();
      try {
        const actionState = getActionState(resolvedDoc) || {};
        return renderStudioInsertionToolbarActionState({
          documentRef: getDocumentRef(),
          ...actionState
        });
      } catch (error) {
        return false;
      }
    };
  }

  function resolveStudioWallpaperActionState(doc, options = {}) {
    const getActiveSlide = typeof options.getActiveSlide === 'function'
      ? options.getActiveSlide
      : () => null;
    const activeSlide = getActiveSlide(doc);

    return {
      activeSlide,
      canUseWallpaperControls: !!activeSlide
    };
  }

  function resolveStudioWallpaperCanonicalActionState(doc, options = {}) {
    const actionState = resolveStudioWallpaperActionState(doc, options);
    const activeSlide = actionState.activeSlide;
    const getSlideId = typeof options.getSlideId === 'function'
      ? options.getSlideId
      : null;
    const resolveCanonicalDeck = typeof options.resolveCanonicalDeck === 'function'
      ? options.resolveCanonicalDeck
      : null;
    if (!activeSlide || !getSlideId || !resolveCanonicalDeck) return actionState;

    const activeSlideId = getSlideId(activeSlide);
    if (!activeSlideId) return actionState;

    try {
      const canonicalDeck = resolveCanonicalDeck(doc);
      const findCanonicalSlideById = typeof options.findCanonicalSlideById === 'function'
        ? options.findCanonicalSlideById
        : (deck, slideId) => deck && Array.isArray(deck.slides)
          ? deck.slides.find((slide) => slide && slide.id === slideId)
          : null;
      const canonicalActiveSlide = findCanonicalSlideById(canonicalDeck, activeSlideId);
      return canonicalActiveSlide
        ? { ...actionState, canonicalActiveSlide }
        : actionState;
    } catch (error) {
      return actionState;
    }
  }

  function renderStudioWallpaperToolbarActionState(options = {}) {
    const documentRef = options.documentRef;
    if (!documentRef || typeof documentRef.getElementById !== 'function') return false;
    const canUseWallpaperControls = !!options.canUseWallpaperControls;
    [
      'wpTabSolid',
      'wpTabPresets',
      'wpTabCustom',
      'wallpaperCustomColor',
      'cgLinearBtn',
      'cgRadialBtn',
      'cgColor1',
      'cgColor2',
      'cgAngle',
      'applyWallpaperToAllSlidesBtn'
    ].forEach((id) => {
      const control = documentRef.getElementById(id);
      if (control) control.disabled = !canUseWallpaperControls;
    });

    ['wallpaperSolidsList', 'wallpaperGradientsList'].forEach((id) => {
      const container = documentRef.getElementById(id);
      if (!container || typeof container.querySelectorAll !== 'function') return;
      container.querySelectorAll('button').forEach((button) => {
        button.disabled = !canUseWallpaperControls;
      });
    });
    return true;
  }

  function syncStudioWallpaperToolbarActionState(options = {}) {
    const actionState = options.actionState || resolveStudioWallpaperActionState(options.doc, {
      getActiveSlide: options.getActiveSlide
    });
    return renderStudioWallpaperToolbarActionState({
      documentRef: options.documentRef,
      ...actionState
    });
  }

  function createStudioWallpaperToolbarActionStateSync(options = {}) {
    const getDocument = typeof options.getDocument === 'function'
      ? options.getDocument
      : () => null;
    const getActionState = typeof options.getActionState === 'function'
      ? options.getActionState
      : (doc) => resolveStudioWallpaperActionState(doc, {
          getActiveSlide: options.getActiveSlide
        });
    const getDocumentRef = typeof options.getDocumentRef === 'function'
      ? options.getDocumentRef
      : () => options.documentRef || null;

    return function syncStudioEditorWallpaperToolbarActionState(doc = null) {
      const resolvedDoc = doc || getDocument();
      try {
        const actionState = getActionState(resolvedDoc) || {};
        return renderStudioWallpaperToolbarActionState({
          documentRef: getDocumentRef(),
          ...actionState
        });
      } catch (error) {
        return false;
      }
    };
  }

  function resolveStudioLiveActiveSlide(doc, options = {}) {
    const querySelector = typeof options.querySelector === 'function'
      ? options.querySelector
      : (nextDoc, selector) => nextDoc && typeof nextDoc.querySelector === 'function'
          ? nextDoc.querySelector(selector)
          : null;
    return querySelector(doc, '.slide-active') || null;
  }

  function resolveStudioLiveActiveSlideId(doc, options = {}) {
    const resolveLiveActiveSlide = typeof options.resolveLiveActiveSlide === 'function'
      ? options.resolveLiveActiveSlide
      : (nextDoc) => resolveStudioLiveActiveSlide(nextDoc, options);
    const activeSlide = resolveLiveActiveSlide(doc);
    if (!activeSlide) {
      return '';
    }

    const getActiveSlideId = typeof options.getActiveSlideId === 'function'
      ? options.getActiveSlideId
      : () => '';
    return getActiveSlideId(doc, activeSlide) || '';
  }

  function resolveStudioFallbackActiveSlideId(doc, canonicalDeck = null, options = {}) {
    const getPersistedActiveSlideId = typeof options.getPersistedActiveSlideId === 'function'
      ? options.getPersistedActiveSlideId
      : () => '';
    const persistedActiveSlideId = getPersistedActiveSlideId();
    const resolveLiveActiveSlideId = typeof options.resolveLiveActiveSlideId === 'function'
      ? options.resolveLiveActiveSlideId
      : () => '';
    const resolveCanonicalDeck = typeof options.resolveCanonicalDeck === 'function'
      ? options.resolveCanonicalDeck
      : () => null;
    const resolveCanonicalDeckOverride = typeof options.resolveCanonicalDeckOverride === 'function'
      ? options.resolveCanonicalDeckOverride
      : (nextCanonicalDeck) => nextCanonicalDeck;
    const isCanonicalDeck = typeof options.isCanonicalDeck === 'function'
      ? options.isCanonicalDeck
      : isCanonicalDeckLike;

    const overriddenCanonicalDeck = resolveCanonicalDeckOverride(canonicalDeck, doc);
    const hasValidCanonicalDeck = !!overriddenCanonicalDeck && isCanonicalDeck(overriddenCanonicalDeck);
    const nextCanonicalDeck = hasValidCanonicalDeck
      ? overriddenCanonicalDeck
      : (overriddenCanonicalDeck ? resolveCanonicalDeck(doc) : null);
    if (doc) {
      const liveActiveSlideId = resolveLiveActiveSlideId(doc);
      if (typeof liveActiveSlideId === 'string' && liveActiveSlideId.trim()) {
        return liveActiveSlideId;
      }
      if (!nextCanonicalDeck) {
        return persistedActiveSlideId;
      }
    }

    const resolvedCanonicalDeck = nextCanonicalDeck || resolveCanonicalDeck(doc);
    if (!isCanonicalDeckLike(resolvedCanonicalDeck) || resolvedCanonicalDeck.slides.length === 0) {
      return persistedActiveSlideId;
    }

    const fallbackIndex = Number.isInteger(options.currentSlideIndex) ? options.currentSlideIndex : 0;
    const safeIndex = Math.max(0, Math.min(fallbackIndex, resolvedCanonicalDeck.slides.length - 1));
    const activeSlide = resolvedCanonicalDeck.slides[safeIndex];
    return activeSlide && typeof activeSlide.id === 'string' && activeSlide.id.trim()
      ? activeSlide.id
      : persistedActiveSlideId;
  }

  function buildStudioDeckHtml(doc, options = {}) {
    const deckHtmlOptions = options.deckHtmlOptions && typeof options.deckHtmlOptions === 'object'
      ? options.deckHtmlOptions
      : doc;
    let canonicalDeck = isCanonicalDeckLike(options.canonicalDeck)
      ? options.canonicalDeck
      : null;
    if (!canonicalDeck && typeof options.buildCanonicalDeck === 'function') {
      try {
        canonicalDeck = options.buildCanonicalDeck(doc);
      } catch (error) {
        canonicalDeck = null;
      }
    }
    if (isCanonicalDeckLike(canonicalDeck) && typeof options.buildCanonicalHtml === 'function') {
      try {
        return options.buildCanonicalHtml(canonicalDeck, deckHtmlOptions);
      } catch (error) {
        // Keep legacy HTML available when canonical rendering cannot represent a node.
      }
    }

    const fallbackHtml = typeof options.buildFallbackHtml === 'function'
      ? options.buildFallbackHtml(doc)
      : '';
    return typeof options.transformFallbackHtml === 'function'
      ? options.transformFallbackHtml(fallbackHtml, deckHtmlOptions)
      : fallbackHtml;
  }

  function buildStudioDeckViewHtml(doc, options = {}) {
    const buildSharedHtml = typeof options.buildSharedHtml === 'function'
      ? options.buildSharedHtml
      : null;
    const deckViewOptions = typeof options.buildViewOptions === 'function'
      ? options.buildViewOptions(doc)
      : {};
    if (buildSharedHtml) {
      return buildSharedHtml(doc, deckViewOptions);
    }

    return buildStudioDeckHtml(doc, {
      ...deckViewOptions,
      buildCanonicalHtml: typeof options.buildCanonicalHtml === 'function'
        ? (canonicalDeck, nextDocOrOptions) => options.buildCanonicalHtml(canonicalDeck, nextDocOrOptions)
        : null,
      transformFallbackHtml: options.transformFallbackHtml
        ? (fallbackHtml, nextDocOrOptions) => options.transformFallbackHtml(fallbackHtml, nextDocOrOptions)
        : null
    });
  }

  function teardownStudioDeckActiveSlideSync(state = {}, options = {}) {
    const disconnectObserver = typeof options.disconnectObserver === 'function'
      ? options.disconnectObserver
      : (observer) => observer && typeof observer.disconnect === 'function' && observer.disconnect();
    const clearTimer = typeof options.clearTimer === 'function'
      ? options.clearTimer
      : (timerId) => clearTimeout(timerId);
    const observer = state.observer || null;
    const timer = state.timer ?? null;
    const hasTimer = timer !== null && typeof timer !== 'undefined';

    if (observer) {
      disconnectObserver(observer);
    }
    if (hasTimer) {
      clearTimer(timer);
    }

    return {
      observer: null,
      timer: null
    };
  }

  function scheduleStudioDeckActiveSlideSync(currentTimer, callback, options = {}) {
    const clearTimer = typeof options.clearTimer === 'function'
      ? options.clearTimer
      : (timerId) => clearTimeout(timerId);
    const scheduleTimer = typeof options.scheduleTimer === 'function'
      ? options.scheduleTimer
      : (nextCallback, delayMs) => setTimeout(nextCallback, delayMs);
    const delayMs = Number.isInteger(options.delayMs) && options.delayMs >= 0
      ? options.delayMs
      : 0;
    const hasCurrentTimer = currentTimer !== null && typeof currentTimer !== 'undefined';

    if (hasCurrentTimer) {
      clearTimer(currentTimer);
    }

    return scheduleTimer(callback, delayMs);
  }

  function observeStudioDeckActiveSlideState(doc, options = {}) {
    const MutationObserverCtor = typeof options.MutationObserverCtor === 'function'
      ? options.MutationObserverCtor
      : (typeof MutationObserver === 'function' ? MutationObserver : null);
    const getSlidesContainer = typeof options.getSlidesContainer === 'function'
      ? options.getSlidesContainer
      : (nextDoc) => nextDoc && typeof nextDoc.getElementById === 'function'
          ? nextDoc.getElementById('slidesContainer')
          : null;
    const shouldSyncMutation = typeof options.shouldSyncMutation === 'function'
      ? options.shouldSyncMutation
      : (mutation, slidesContainer) => {
          if (!mutation || mutation.type !== 'attributes') return false;
          if (mutation.target === slidesContainer && mutation.attributeName === 'style') return true;
          return mutation.attributeName === 'class' && !!mutation.target.classList?.contains('slide');
        };
    const scheduleSync = typeof options.scheduleSync === 'function'
      ? options.scheduleSync
      : () => {};

    if (!doc || !MutationObserverCtor) {
      return {
        didObserve: false,
        observer: null
      };
    }

    const slidesContainer = getSlidesContainer(doc);
    if (!slidesContainer) {
      return {
        didObserve: false,
        observer: null
      };
    }

    const observer = new MutationObserverCtor((mutations) => {
      const shouldSync = Array.isArray(mutations) && mutations.some((mutation) => {
        return shouldSyncMutation(mutation, slidesContainer);
      });
      if (shouldSync) {
        scheduleSync(doc);
      }
    });

    observer.observe(slidesContainer, {
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style']
    });

    return {
      didObserve: true,
      observer
    };
  }

  function bindStudioDeckNavigationSync(doc, frameWin, options = {}) {
    const getGoToSlide = typeof options.getGoToSlide === 'function'
      ? options.getGoToSlide
      : (win) => win && typeof win.goToSlide === 'function' ? win.goToSlide : null;
    const isAlreadyWrapped = typeof options.isAlreadyWrapped === 'function'
      ? options.isAlreadyWrapped
      : (win) => !!(win && win.__studioGoToSlideWrapped);
    const markWrapped = typeof options.markWrapped === 'function'
      ? options.markWrapped
      : (win) => {
          if (win) {
            win.__studioGoToSlideWrapped = true;
          }
        };
    const setGoToSlide = typeof options.setGoToSlide === 'function'
      ? options.setGoToSlide
      : (win, nextGoToSlide) => {
          if (win) {
            win.goToSlide = nextGoToSlide;
          }
        };
    const syncStudioChromeToActiveSlide = typeof options.syncStudioChromeToActiveSlide === 'function'
      ? options.syncStudioChromeToActiveSlide
      : () => {};
    const getSyncStudioChromeOptions = typeof options.getSyncStudioChromeOptions === 'function'
      ? options.getSyncStudioChromeOptions
      : () => options.syncStudioChromeOptions || {};

    const originalGoToSlide = getGoToSlide(frameWin);
    if (!doc || !frameWin || typeof originalGoToSlide !== 'function' || isAlreadyWrapped(frameWin)) {
      return false;
    }

    setGoToSlide(frameWin, (index) => {
      const result = originalGoToSlide.call(frameWin, index);
      syncStudioChromeToActiveSlide(doc, getSyncStudioChromeOptions(index));
      return result;
    });
    markWrapped(frameWin);
    return true;
  }

  function updateStudioDeckActiveThumbnailCardState(cards, activeSlideId, options = {}) {
    const activeClassName = options.activeClassName || ACTIVE_THUMBNAIL_CARD_CLASS_NAME;
    const inactiveClassName = options.inactiveClassName || INACTIVE_THUMBNAIL_CARD_CLASS_NAME;
    Array.from(cards || []).forEach((card) => {
      if (!card) return;
      card.className = card.dataset && card.dataset.slideId === activeSlideId
        ? activeClassName
        : inactiveClassName;
    });
  }

  function syncStudioDeckActiveThumbnailCardState(options = {}) {
    const documentRef = options.documentRef;
    if (!documentRef || typeof documentRef.querySelectorAll !== 'function') return false;

    updateStudioDeckActiveThumbnailCardState(
      documentRef.querySelectorAll('#thumbnailsList > div'),
      options.activeSlideId,
      options
    );
    return true;
  }

  function runStudioSlideMutationWithTransaction(container, mutate, options = {}) {
    if (!container || typeof mutate !== 'function') {
      return {
        didApply: false,
        transaction: null
      };
    }

    const createMarkupTransactionCapture = typeof options.createMarkupTransactionCapture === 'function'
      ? options.createMarkupTransactionCapture
      : null;
    const containerElementId = typeof options.containerElementId === 'string'
      && options.containerElementId.trim()
      ? options.containerElementId.trim()
      : 'slides-container';
    const markupCapture = options.skipMarkupTransactionCapture !== true
      && createMarkupTransactionCapture
      ? createMarkupTransactionCapture([{
          element: container,
          elementId: containerElementId
        }], {
          getElementId: options.getElementId
        })
      : null;

    mutate();

    return {
      didApply: true,
      transaction: markupCapture
        ? markupCapture.createTransaction()
        : null
    };
  }

  function applyStudioSlideReorderMutation(container, draggedNode, beforeNode = null, options = {}) {
    if (!container
      || !draggedNode
      || typeof container.insertBefore !== 'function') {
      return {
        didApply: false,
        transaction: null
      };
    }

    return runStudioSlideMutationWithTransaction(
      container,
      () => container.insertBefore(draggedNode, beforeNode || null),
      options
    );
  }

  function applyStudioSlideInsertionMutation(container, slideNode, options = {}) {
    if (!container
      || !slideNode
      || (typeof container.appendChild !== 'function' && typeof container.insertBefore !== 'function')) {
      return {
        didApply: false,
        transaction: null
      };
    }

    return runStudioSlideMutationWithTransaction(
      container,
      () => {
        if (options.beforeNode && typeof container.insertBefore === 'function') {
          container.insertBefore(slideNode, options.beforeNode);
        } else {
          container.appendChild(slideNode);
        }
      },
      options
    );
  }

  function applyStudioSlideDeletionMutation(container, slideNode, options = {}) {
    if (!container
      || !slideNode
      || typeof slideNode.remove !== 'function') {
      return {
        didApply: false,
        transaction: null
      };
    }

    return runStudioSlideMutationWithTransaction(
      container,
      () => slideNode.remove(),
      options
    );
  }

  function syncStudioActiveSlideView(doc, options = {}) {
    const getSlides = typeof options.getSlides === 'function'
      ? options.getSlides
      : () => [];
    const setCurrentSlideIndex = typeof options.setCurrentSlideIndex === 'function'
      ? options.setCurrentSlideIndex
      : () => {};
    const updateActiveThumbnailCardState = typeof options.updateActiveThumbnailCardState === 'function'
      ? options.updateActiveThumbnailCardState
      : () => {};
    const setSlideCountLabel = typeof options.setSlideCountLabel === 'function'
      ? options.setSlideCountLabel
      : () => {};
    const deselectElement = typeof options.deselectElement === 'function'
      ? options.deselectElement
      : () => {};
    const getIsSlideActive = typeof options.getIsSlideActive === 'function'
      ? options.getIsSlideActive
      : (slide) => !!(slide && slide.classList && slide.classList.contains('slide-active'));
    const applyViewportTransform = typeof options.applyViewportTransform === 'function'
      ? options.applyViewportTransform
      : () => {};
    const pruneEditorChromeNodes = typeof options.pruneEditorChromeNodes === 'function'
      ? options.pruneEditorChromeNodes
      : () => {};
    const getSlideId = typeof options.getSlideId === 'function'
      ? options.getSlideId
      : (slide) => slide && typeof slide.getAttribute === 'function' ? (slide.getAttribute('data-slide-id') || '') : '';
    const updateIframeNavigationUI = typeof options.updateIframeNavigationUI === 'function'
      ? options.updateIframeNavigationUI
      : () => {};
    const normalizeViewport = options.normalizeViewport !== false;
    const preserveSelection = !!options.preserveSelection;

    const slides = getSlides(doc);
    if (slides.length === 0) {
      setCurrentSlideIndex(0);
      updateActiveThumbnailCardState('');
      setSlideCountLabel('0 / 0');
      deselectElement();
      return {
        didSync: false,
        activeIndex: -1,
        activeSlideId: '',
        slideCount: 0
      };
    }

    const activeIndex = slides.findIndex((slide) => getIsSlideActive(slide));
    if (activeIndex === -1) {
      return {
        didSync: false,
        activeIndex: -1,
        activeSlideId: '',
        slideCount: slides.length
      };
    }

    setCurrentSlideIndex(activeIndex);
    if (normalizeViewport) {
      applyViewportTransform(doc, activeIndex);
    }

    const activeSlide = slides[activeIndex];
    pruneEditorChromeNodes(doc, activeSlide);
    const activeSlideId = getSlideId(activeSlide);
    updateActiveThumbnailCardState(activeSlideId);
    updateIframeNavigationUI(doc, slides);
    setSlideCountLabel(`${activeIndex + 1} / ${slides.length}`);
    if (!preserveSelection) {
      deselectElement();
    }

    return {
      didSync: true,
      activeIndex,
      activeSlideId,
      slideCount: slides.length
    };
  }

  function setStudioDeckActiveSlide(index, options = {}) {
    const doc = options.doc || null;
    const getSlides = typeof options.getSlides === 'function'
      ? options.getSlides
      : () => [];
    const getSlidesContainer = typeof options.getSlidesContainer === 'function'
      ? options.getSlidesContainer
      : (nextDoc) => nextDoc && typeof nextDoc.getElementById === 'function'
          ? nextDoc.getElementById('slidesContainer')
          : null;
    const setSlideContainerOffset = typeof options.setSlideContainerOffset === 'function'
      ? options.setSlideContainerOffset
      : (container, activeIndex) => {
          if (container && container.style) {
            container.style.transform = `translateX(-${activeIndex * 100}vw)`;
          }
        };
    const setSlideActiveState = typeof options.setSlideActiveState === 'function'
      ? options.setSlideActiveState
      : (slide, isActive) => {
          if (!slide || !slide.classList) return;
          if (isActive) {
            slide.classList.add('slide-active');
          } else {
            slide.classList.remove('slide-active');
          }
        };
    const syncStudioChromeToActiveSlide = typeof options.syncStudioChromeToActiveSlide === 'function'
      ? options.syncStudioChromeToActiveSlide
      : () => false;
    const getCurrentSlideIndex = typeof options.getCurrentSlideIndex === 'function'
      ? options.getCurrentSlideIndex
      : null;
    const captureHistory = !!options.captureHistory;
    const preserveSelection = !!options.preserveSelection;

    const slides = getSlides(doc);
    if (!Number.isInteger(index) || index < 0 || index >= slides.length) {
      return false;
    }

    const container = getSlidesContainer(doc);
    let previousIndex = getCurrentSlideIndex ? getCurrentSlideIndex() : -1;
    if (!Number.isInteger(previousIndex) || previousIndex < 0 || previousIndex >= slides.length) {
      previousIndex = slides.findIndex((slide) => (
        slide
        && slide.classList
        && typeof slide.classList.contains === 'function'
        && slide.classList.contains('slide-active')
      ));
    }
    setSlideContainerOffset(container, index);
    slides.forEach((slide, slideIndex) => {
      setSlideActiveState(slide, slideIndex === index);
    });

    const syncResult = syncStudioChromeToActiveSlide(doc, { captureHistory, preserveSelection });
    if (syncResult === false && previousIndex >= 0 && previousIndex < slides.length) {
      setSlideContainerOffset(container, previousIndex);
      slides.forEach((slide, slideIndex) => {
        setSlideActiveState(slide, slideIndex === previousIndex);
      });
      syncStudioChromeToActiveSlide(doc, {
        captureHistory: false,
        preserveSelection: true
      });
    }
    return syncResult !== false;
  }

  function resetStudioDeckSidebarUiState(options = {}) {
    const documentRef = options.documentRef;
    if (!documentRef || typeof documentRef.getElementById !== 'function') return false;

    const isLoading = !!options.isLoading;
    const slideCountLabel = documentRef.getElementById('slideCountLabel');
    if (slideCountLabel) {
      slideCountLabel.textContent = '0 / 0';
    }

    const thumbnailsList = documentRef.getElementById('thumbnailsList');
    if (thumbnailsList) {
      thumbnailsList.innerHTML = `<p class="text-[10px] text-zinc-500 font-mono text-center py-6">${isLoading ? 'Loading slides...' : 'No slides loaded'}</p>`;
    }

    const slideLayersList = documentRef.getElementById('slideLayersList');
    if (slideLayersList) {
      slideLayersList.innerHTML = `<p class="text-[10px] text-zinc-500 font-mono text-center py-2">${isLoading ? 'Loading layers...' : 'No active slide'}</p>`;
    }
    return true;
  }

  function setStudioDeckActiveSlideById(slideId, options = {}) {
    const doc = options.doc || null;
    const getSlideIndexById = typeof options.getSlideIndexById === 'function'
      ? options.getSlideIndexById
      : () => -1;
    const activateSlideByIndex = typeof options.activateSlideByIndex === 'function'
      ? options.activateSlideByIndex
      : () => false;

    const index = getSlideIndexById(slideId, doc);
    if (index === -1) {
      return false;
    }

    return activateSlideByIndex(index) !== false;
  }

  function captureStudioDeckViewBeforeSlideMutation(options = {}) {
    const doc = options.doc || null;
    const saveHistoryState = typeof options.saveHistoryState === 'function'
      ? options.saveHistoryState
      : () => {};
    const buildCanonicalDeck = typeof options.buildCanonicalDeck === 'function'
      ? options.buildCanonicalDeck
      : null;
    const isCanonicalDeck = typeof options.isCanonicalDeck === 'function'
      ? options.isCanonicalDeck
      : null;
    const getActiveSlideId = typeof options.getActiveSlideId === 'function'
      ? options.getActiveSlideId
      : () => '';
    const getCommittedSelectedElementIds = typeof options.getCommittedSelectedElementIds === 'function'
      ? options.getCommittedSelectedElementIds
      : () => [];

    let canonicalDeck = null;
    if (buildCanonicalDeck) {
      try {
        const candidate = buildCanonicalDeck(doc);
        const validate = isCanonicalDeck
          || ((value) => !!value
            && typeof value === 'object'
            && !Array.isArray(value)
            && Array.isArray(value.slides));
        if (candidate && validate(candidate) === true) canonicalDeck = candidate;
      } catch (error) {
        canonicalDeck = null;
      }
    }
    const historyCaptureResult = canonicalDeck
      ? captureStudioHistoryState(saveHistoryState, false, null, canonicalDeck)
      : captureStudioHistoryState(saveHistoryState);
    if (isStudioHistoryCaptureFailure(historyCaptureResult)) {
      return {
        historyCaptureFailed: true,
        preservedActiveSlideId: '',
        preservedSelectionIds: []
      };
    }
    return {
      preservedActiveSlideId: getActiveSlideId(doc),
      preservedSelectionIds: getCommittedSelectedElementIds(doc)
    };
  }

  function restoreStudioDeckViewAfterSlideMutation(options = {}) {
    const preservedActiveSlideId = typeof options.preservedActiveSlideId === 'string'
      ? options.preservedActiveSlideId
      : '';
    const removedSlideId = typeof options.removedSlideId === 'string'
      ? options.removedSlideId
      : '';
    const restoreActiveSlideById = typeof options.restoreActiveSlideById === 'function'
      ? options.restoreActiveSlideById
      : () => false;
    const restoreSelectionState = typeof options.restoreSelectionState === 'function'
      ? options.restoreSelectionState
      : () => {};
    const setActiveSlideByIndex = typeof options.setActiveSlideByIndex === 'function'
      ? options.setActiveSlideByIndex
      : () => {};
    const fallbackIndex = Number.isInteger(options.fallbackIndex)
      ? options.fallbackIndex
      : 0;
    const canRestorePreservedActiveSlide = !!preservedActiveSlideId
      && (!removedSlideId || preservedActiveSlideId !== removedSlideId);

    if (canRestorePreservedActiveSlide && restoreActiveSlideById(preservedActiveSlideId)) {
      restoreSelectionState();
      return {
        didRestorePreservedActiveSlide: true,
        activeSlideId: preservedActiveSlideId,
        fallbackIndex: null
      };
    }

    setActiveSlideByIndex(fallbackIndex);
    return {
      didRestorePreservedActiveSlide: false,
      activeSlideId: '',
      fallbackIndex
    };
  }

  function updateStudioDeckNavigationUi(doc, slides = [], currentSlideIndex, options = {}) {
    const getIndicatorDotsContainer = typeof options.getIndicatorDotsContainer === 'function'
      ? options.getIndicatorDotsContainer
      : (nextDoc) => nextDoc && typeof nextDoc.getElementById === 'function'
          ? nextDoc.getElementById('indicatorDots')
          : null;
    const createIndicatorDot = typeof options.createIndicatorDot === 'function'
      ? options.createIndicatorDot
      : (nextDoc) => nextDoc && typeof nextDoc.createElement === 'function'
          ? nextDoc.createElement('div')
          : null;
    const appendIndicatorDot = typeof options.appendIndicatorDot === 'function'
      ? options.appendIndicatorDot
      : (container, dot) => {
          if (container && dot) {
            container.appendChild(dot);
          }
        };
    const bindIndicatorDotClick = typeof options.bindIndicatorDotClick === 'function'
      ? options.bindIndicatorDotClick
      : (dot, index, setActiveSlide) => {
          if (dot && typeof dot.addEventListener === 'function') {
            dot.addEventListener('click', () => {
              setActiveSlide(index);
            });
          }
        };
    const setIndicatorDotsHtml = typeof options.setIndicatorDotsHtml === 'function'
      ? options.setIndicatorDotsHtml
      : (container, html) => {
          if (container) {
            container.innerHTML = html;
          }
        };
    const setActiveSlide = typeof options.setActiveSlide === 'function'
      ? options.setActiveSlide
      : () => {};
    const getSlideNumNode = typeof options.getSlideNumNode === 'function'
      ? options.getSlideNumNode
      : (nextDoc) => nextDoc && typeof nextDoc.getElementById === 'function'
          ? nextDoc.getElementById('slideNum')
          : null;
    const setSlideNumText = typeof options.setSlideNumText === 'function'
      ? options.setSlideNumText
      : (node, text) => {
          if (node) {
            node.textContent = text;
          }
        };
    const getProgressLineNode = typeof options.getProgressLineNode === 'function'
      ? options.getProgressLineNode
      : (nextDoc) => nextDoc && typeof nextDoc.getElementById === 'function'
          ? nextDoc.getElementById('progressLine')
          : null;
    const setProgressPercent = typeof options.setProgressPercent === 'function'
      ? options.setProgressPercent
      : (node, percent) => {
          if (node && node.style) {
            node.style.width = `${percent}%`;
          }
        };
    const getPrevButton = typeof options.getPrevButton === 'function'
      ? options.getPrevButton
      : (nextDoc) => nextDoc && typeof nextDoc.getElementById === 'function'
          ? nextDoc.getElementById('prevBtn')
          : null;
    const getNextButton = typeof options.getNextButton === 'function'
      ? options.getNextButton
      : (nextDoc) => nextDoc && typeof nextDoc.getElementById === 'function'
          ? nextDoc.getElementById('nextBtn')
          : null;
    const setButtonEnabledState = typeof options.setButtonEnabledState === 'function'
      ? options.setButtonEnabledState
      : (node, isEnabled) => {
          if (!node || !node.style) return;
          node.style.opacity = isEnabled ? '1' : '0.3';
          node.style.pointerEvents = isEnabled ? 'auto' : 'none';
        };

    const totalSlides = Array.isArray(slides) ? slides.length : 0;
    const dotsContainer = getIndicatorDotsContainer(doc);
    if (dotsContainer) {
      setIndicatorDotsHtml(dotsContainer, '');
      for (let i = 0; i < totalSlides; i += 1) {
        const dot = createIndicatorDot(doc);
        if (!dot) continue;
        dot.className = `indicator-dot ${i === currentSlideIndex ? 'active' : ''}`;
        bindIndicatorDotClick(dot, i, setActiveSlide);
        appendIndicatorDot(dotsContainer, dot);
      }
    }

    const slideNumText = getSlideNumNode(doc);
    const formattedNum = String(currentSlideIndex + 1).padStart(2, '0');
    const formattedTotal = String(totalSlides).padStart(2, '0');
    setSlideNumText(slideNumText, `${formattedNum} / ${formattedTotal}`);

    const progressLine = getProgressLineNode(doc);
    const progressPercent = totalSlides === 0 ? 0 : ((currentSlideIndex + 1) / totalSlides) * 100;
    setProgressPercent(progressLine, progressPercent);

    const prevBtn = getPrevButton(doc);
    const nextBtn = getNextButton(doc);
    setButtonEnabledState(prevBtn, currentSlideIndex !== 0);
    setButtonEnabledState(nextBtn, currentSlideIndex !== totalSlides - 1);

    return {
      totalSlides,
      currentSlideIndex,
      formattedNum,
      formattedTotal,
      progressPercent
    };
  }

  function buildStudioPreviewHtml(doc, options = {}) {
    return buildStudioDeckHtml(doc, {
      ...options,
      buildCanonicalHtml: deckHtml && typeof deckHtml.buildDeckPreviewHtml === 'function'
        ? (canonicalDeck) => deckHtml.buildDeckPreviewHtml(
            canonicalDeck,
            options.presentationUrl || '',
            options.deckHtmlOptions || {}
          )
        : null,
      transformFallbackHtml(fallbackHtml) {
        if (!fallbackHtml) {
          return fallbackHtml;
        }

        const injectBaseHrefIntoHtml = deckHtml && typeof deckHtml.injectBaseHrefIntoHtml === 'function'
          ? deckHtml.injectBaseHrefIntoHtml
          : null;
        const buildPresentationBaseHref = deckHtml && typeof deckHtml.buildPresentationBaseHref === 'function'
          ? deckHtml.buildPresentationBaseHref
          : null;
        if (!injectBaseHrefIntoHtml || !buildPresentationBaseHref) {
          return fallbackHtml;
        }

        return injectBaseHrefIntoHtml(
          fallbackHtml,
          buildPresentationBaseHref(options.presentationUrl || '', options.deckHtmlOptions || {})
        );
      }
    });
  }

  function buildStudioSourceHtml(doc, options = {}) {
    return buildStudioDeckHtml(doc, {
      ...options,
      buildCanonicalHtml: deckHtml && typeof deckHtml.buildDeckSourceHtml === 'function'
        ? (canonicalDeck) => deckHtml.buildDeckSourceHtml(canonicalDeck, options.deckHtmlOptions || {})
        : null
    });
  }

  return {
    teardownStudioDeckActiveSlideSync,
    scheduleStudioDeckActiveSlideSync,
    observeStudioDeckActiveSlideState,
    bindStudioDeckNavigationSync,
    updateStudioDeckActiveThumbnailCardState,
    syncStudioDeckActiveThumbnailCardState,
    resetStudioDeckSidebarUiState,
    applyStudioSlideReorderMutation,
    applyStudioSlideInsertionMutation,
    applyStudioSlideDeletionMutation,
    syncStudioActiveSlideView,
    setStudioDeckActiveSlide,
    setStudioDeckActiveSlideById,
    captureStudioDeckViewBeforeSlideMutation,
    restoreStudioDeckViewAfterSlideMutation,
    updateStudioDeckNavigationUi,
    isCanonicalDeckLike,
    createStudioCanonicalDeckResolver,
    createStudioDeckViewCanonicalStateOptions,
    resolveStudioCanonicalDeckViewState,
    createStudioDeckViewBuildOptions,
    createStudioDeckViewBuildViewOptionsResolver,
    createStudioDeckViewCanonicalHtmlResolver,
    createStudioDeckViewHtmlOptions,
    createStudioDeckRenderOptions,
    createStudioDeckViewSharedOptions,
    resolveStudioZoomActionState,
    renderStudioZoomToolbarActionState,
    syncStudioZoomToolbarActionState,
    createStudioZoomToolbarActionStateSync,
    resolveStudioInsertionActionState,
    renderStudioInsertionToolbarActionState,
    bindStudioEditorSlideInsertionControls,
    syncStudioInsertionToolbarActionState,
    createStudioInsertionToolbarActionStateSync,
    resolveStudioWallpaperActionState,
    resolveStudioWallpaperCanonicalActionState,
    renderStudioWallpaperToolbarActionState,
    syncStudioWallpaperToolbarActionState,
    createStudioWallpaperToolbarActionStateSync,
    resolveStudioLiveActiveSlide,
    resolveStudioLiveActiveSlideId,
    resolveStudioFallbackActiveSlideId,
    buildStudioDeckHtml,
    buildStudioDeckViewHtml,
    buildStudioPreviewHtml,
    buildStudioSourceHtml
  };
});
