(function (root, factory) {
  const presentationMetadata = typeof module === 'object' && module.exports
    ? require('./presentation-metadata')
    : root && root.SlideNextPresentationMetadata;
  const api = factory(presentationMetadata);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorPersistence = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (presentationMetadata) {
  function normalizeString(value, fallback = '') {
    return typeof value === 'string' ? value : fallback;
  }

  function asPlainObject(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return {};
    }
    return { ...value };
  }

  function isStructurallyValidStudioCanonicalDeck(value) {
    return !!value
      && typeof value === 'object'
      && !Array.isArray(value)
      && Array.isArray(value.slides);
  }

  function normalizeSessionToken(value) {
    return Number.isInteger(value) ? value : null;
  }

  function createStudioPersistableDeckState(doc = null, persistedDeckState = {}) {
    return {
      doc,
      ...asPlainObject(persistedDeckState)
    };
  }

  function createStudioPersistedDeckStateSnapshot(options = {}) {
    const hasPersistedCanonicalDeck = Object.prototype.hasOwnProperty.call(options, 'persistedCanonicalDeck');
    const hasPersistedPlaybackState = Object.prototype.hasOwnProperty.call(options, 'persistedPlaybackState');

    return {
      cleanHtml: normalizeString(options.persistedDeckHtml),
      canonicalDeck: hasPersistedCanonicalDeck ? options.persistedCanonicalDeck : null,
      playbackState: hasPersistedPlaybackState ? options.persistedPlaybackState : null
    };
  }

  function createStudioPersistedDeckStateReader(options = {}) {
    const getPersistedDeckHtml = typeof options.getPersistedDeckHtml === 'function'
      ? options.getPersistedDeckHtml
      : () => options.persistedDeckHtml;
    const getPersistedCanonicalDeck = typeof options.getPersistedCanonicalDeck === 'function'
      ? options.getPersistedCanonicalDeck
      : () => options.persistedCanonicalDeck;
    const getPersistedPlaybackState = typeof options.getPersistedPlaybackState === 'function'
      ? options.getPersistedPlaybackState
      : () => options.persistedPlaybackState;

    const readPersistedDeckState = function () {
      return createStudioPersistedDeckStateSnapshot({
        persistedDeckHtml: getPersistedDeckHtml(),
        persistedCanonicalDeck: getPersistedCanonicalDeck(),
        persistedPlaybackState: getPersistedPlaybackState()
      });
    };

    readPersistedDeckState.resolveWithContent = function (persistedDeckState = readPersistedDeckState()) {
      const resolvePersistedDeckStateSnapshotWithContent = typeof options.resolvePersistedDeckStateSnapshotWithContent === 'function'
        ? options.resolvePersistedDeckStateSnapshotWithContent
        : null;
      if (resolvePersistedDeckStateSnapshotWithContent) {
        return resolvePersistedDeckStateSnapshotWithContent({ persistedDeckState });
      }

      const resolvePersistableDeckStateWithContent = typeof options.resolvePersistableDeckStateWithContent === 'function'
        ? options.resolvePersistableDeckStateWithContent
        : resolveStudioPersistableDeckStateWithContent;
      return resolvePersistableDeckStateWithContent(persistedDeckState);
    };

    return readPersistedDeckState;
  }

  function createStudioPersistedDeckStateUpdater(options = {}) {
    return function updatePersistedDeckState(nextState = {}) {
      return updateStudioPersistedDeckState(nextState, options);
    };
  }

  function resolveStudioPersistedDeckStateSnapshotWithContent(options = {}) {
    const persistedDeckState = Object.prototype.hasOwnProperty.call(options, 'persistedDeckState')
      ? options.persistedDeckState
      : createStudioPersistedDeckStateSnapshot(options);
    return resolveStudioPersistableDeckStateWithContent(persistedDeckState);
  }

  function applyStudioPersistedDeckState(nextState = {}, options = {}) {
    const updatePersistedDeckState = typeof options.updatePersistedDeckState === 'function'
      ? options.updatePersistedDeckState
      : null;
    if (updatePersistedDeckState) {
      updatePersistedDeckState(nextState);
    }

    if (!Object.prototype.hasOwnProperty.call(nextState, 'canonicalDeck') || options.syncPresentationMetadata === false) {
      return nextState;
    }

    const presentationUrl = Object.prototype.hasOwnProperty.call(options, 'presentationUrl')
      ? options.presentationUrl
      : normalizeString(options.currentPresentationUrl);
    const setCurrentPresentationCanonicalDeck = typeof options.setCurrentPresentationCanonicalDeck === 'function'
      ? options.setCurrentPresentationCanonicalDeck
      : null;
    if (setCurrentPresentationCanonicalDeck) {
      setCurrentPresentationCanonicalDeck(nextState.canonicalDeck, presentationUrl);
    }

    return nextState;
  }

  function createStudioPersistedDeckStateApplier(options = {}) {
    return function applyPersistedDeckState(nextState = {}, nextOptions = {}) {
      const currentPresentationUrl = typeof options.getCurrentPresentationUrl === 'function'
        ? options.getCurrentPresentationUrl()
        : options.currentPresentationUrl;
      return applyStudioPersistedDeckState(nextState, {
        ...options,
        currentPresentationUrl,
        ...nextOptions
      });
    };
  }

  function createStudioPersistedDeckStateContentResolver(options = {}) {
    const readPersistedDeckState = typeof options.readPersistedDeckState === 'function'
      ? options.readPersistedDeckState
      : () => null;
    const resolveWithContent = typeof options.resolveWithContent === 'function'
      ? options.resolveWithContent
      : (persistedDeckState) => persistedDeckState;

    return function resolvePersistedDeckStateWithContent(persistedDeckState = readPersistedDeckState()) {
      return resolveWithContent(persistedDeckState);
    };
  }

  function createStudioPersistedActiveSlideIdReader(options = {}) {
    const getPlaybackState = typeof options.getPlaybackState === 'function'
      ? options.getPlaybackState
      : () => options.playbackState;
    const resolvePersistedDeckActiveSlideId = typeof options.resolvePersistedDeckActiveSlideId === 'function'
      ? options.resolvePersistedDeckActiveSlideId
      : null;

    return function getPersistedActiveSlideId(playbackState = getPlaybackState()) {
      if (resolvePersistedDeckActiveSlideId) {
        return resolvePersistedDeckActiveSlideId(playbackState);
      }

      if (!playbackState || typeof playbackState !== 'object') {
        return '';
      }
      if (Array.isArray(playbackState.activeSlideIds)) {
        return playbackState.activeSlideIds.find((slideId) => typeof slideId === 'string' && slideId.trim()) || '';
      }
      return typeof playbackState.activeSlideId === 'string' ? playbackState.activeSlideId : '';
    };
  }

  function syncStudioPresentationMetadataPersistedCanonicalDeck(metadata = null, options = {}) {
    if (!metadata) {
      return null;
    }

    const resolveStoredCanonicalDeck = typeof options.resolveStoredCanonicalDeck === 'function'
      ? options.resolveStoredCanonicalDeck
      : null;
    const storedCanonicalDeck = resolveStoredCanonicalDeck
      ? resolveStoredCanonicalDeck(metadata)
      : null;
    if (!storedCanonicalDeck) {
      return null;
    }

    const applyPersistedDeckState = typeof options.applyPersistedDeckState === 'function'
      ? options.applyPersistedDeckState
      : null;
    if (applyPersistedDeckState) {
      applyPersistedDeckState(
        { canonicalDeck: storedCanonicalDeck },
        {
          presentationUrl: Object.prototype.hasOwnProperty.call(options, 'presentationUrl')
            ? options.presentationUrl
            : normalizeString(options.currentPresentationUrl),
          syncPresentationMetadata: false
        }
      );
    }

    const getIframeDoc = typeof options.getIframeDoc === 'function'
      ? options.getIframeDoc
      : null;
    if (!getIframeDoc) {
      return storedCanonicalDeck;
    }

    const iframeDoc = getIframeDoc();
    if (!iframeDoc) {
      if (typeof options.generateThumbnails === 'function') {
        options.generateThumbnails();
      }
      if (typeof options.syncStudioChromeToActiveSlide === 'function') {
        options.syncStudioChromeToActiveSlide(iframeDoc);
      }
      if (typeof options.updateDeckReadyToolbarActionState === 'function') {
        options.updateDeckReadyToolbarActionState(iframeDoc);
      }
    }

    return storedCanonicalDeck;
  }

  function updateStudioPersistedDeckState(nextState = {}, options = {}) {
    const nextResolvedState = {};

    if (Object.prototype.hasOwnProperty.call(nextState, 'cleanHtml')) {
      nextResolvedState.cleanHtml = normalizeString(nextState.cleanHtml);
      if (typeof options.setPersistedDeckHtml === 'function') {
        options.setPersistedDeckHtml(nextResolvedState.cleanHtml);
      }
    }

    if (Object.prototype.hasOwnProperty.call(nextState, 'canonicalDeck')) {
      const resolveCanonicalDeck = typeof options.resolveCanonicalDeck === 'function'
        ? options.resolveCanonicalDeck
        : (canonicalDeck) => canonicalDeck || null;
      nextResolvedState.canonicalDeck = resolveCanonicalDeck(nextState.canonicalDeck) || null;
      if (typeof options.setPersistedCanonicalDeck === 'function') {
        options.setPersistedCanonicalDeck(nextResolvedState.canonicalDeck);
      }
    }

    if (Object.prototype.hasOwnProperty.call(nextState, 'playbackState')) {
      const normalizePlaybackState = typeof options.normalizePlaybackState === 'function'
        ? options.normalizePlaybackState
        : (playbackState) => playbackState || null;
      nextResolvedState.playbackState = normalizePlaybackState(nextState.playbackState);
      if (typeof options.setPersistedPlaybackState === 'function') {
        options.setPersistedPlaybackState(nextResolvedState.playbackState);
      }
    }

    return nextResolvedState;
  }

  function captureStudioPersistedDeckPlaybackState(doc = null, options = {}) {
    const capturePersistedDeckPlaybackStateWithFallback = typeof options.capturePersistedDeckPlaybackStateWithFallback === 'function'
      ? options.capturePersistedDeckPlaybackStateWithFallback
      : null;
    const capturePersistedDeckPlaybackState = typeof options.capturePersistedDeckPlaybackState === 'function'
      ? options.capturePersistedDeckPlaybackState
      : () => null;
    const ensurePersistedDeckPlaybackStateActiveSlideId = typeof options.ensurePersistedDeckPlaybackStateActiveSlideId === 'function'
      ? options.ensurePersistedDeckPlaybackStateActiveSlideId
      : null;
    const resolveFallbackActiveSlideId = doc && typeof options.resolveFallbackActiveSlideId === 'function'
      ? (...args) => options.resolveFallbackActiveSlideId(...args)
      : null;
    const captureOptions = {
      getSlides: typeof options.getSlides === 'function'
        ? options.getSlides
        : null,
      slideIdAttr: normalizeString(options.slideIdAttr)
    };

    if (capturePersistedDeckPlaybackStateWithFallback) {
      return capturePersistedDeckPlaybackStateWithFallback(doc, {
        ...captureOptions,
        resolveFallbackActiveSlideId
      });
    }

    const playbackState = capturePersistedDeckPlaybackState(doc, captureOptions);
    if (!doc) {
      return playbackState;
    }
    if (ensurePersistedDeckPlaybackStateActiveSlideId) {
      return ensurePersistedDeckPlaybackStateActiveSlideId(playbackState, {
        resolveFallbackActiveSlideId
      });
    }

    const hasActiveSlideIds = !!(playbackState
      && Array.isArray(playbackState.activeSlideIds)
      && playbackState.activeSlideIds.some((slideId) => typeof slideId === 'string' && slideId.trim()));
    if (hasActiveSlideIds) {
      return playbackState;
    }

    const fallbackActiveSlideId = resolveFallbackActiveSlideId
      ? resolveFallbackActiveSlideId(playbackState)
      : '';
    if (!fallbackActiveSlideId) {
      return playbackState;
    }

    return {
      activeSlideIds: [fallbackActiveSlideId],
      slideCounterText: playbackState && typeof playbackState.slideCounterText === 'string'
        ? playbackState.slideCounterText
        : ''
    };
  }

  function createStudioPersistedDeckPlaybackStateCapturer(options = {}) {
    const capturePlaybackState = typeof options.capturePlaybackState === 'function'
      ? options.capturePlaybackState
      : captureStudioPersistedDeckPlaybackState;
    const capturePersistedDeckPlaybackStateWithFallback = typeof options.capturePersistedDeckPlaybackStateWithFallback === 'function'
      ? options.capturePersistedDeckPlaybackStateWithFallback
      : null;
    const capturePersistedDeckPlaybackState = typeof options.capturePersistedDeckPlaybackState === 'function'
      ? options.capturePersistedDeckPlaybackState
      : null;
    const ensurePersistedDeckPlaybackStateActiveSlideId = typeof options.ensurePersistedDeckPlaybackStateActiveSlideId === 'function'
      ? options.ensurePersistedDeckPlaybackStateActiveSlideId
      : null;
    const getSlides = typeof options.getSlides === 'function'
      ? options.getSlides
      : null;
    const slideIdAttr = normalizeString(options.slideIdAttr);
    const resolveFallbackActiveSlideId = typeof options.resolveFallbackActiveSlideId === 'function'
      ? options.resolveFallbackActiveSlideId
      : null;

    return function capturePersistedDeckPlaybackStateWithDefaults(doc = null, nextOptions = {}) {
      return capturePlaybackState(doc, {
        capturePersistedDeckPlaybackStateWithFallback: typeof nextOptions.capturePersistedDeckPlaybackStateWithFallback === 'function'
          ? nextOptions.capturePersistedDeckPlaybackStateWithFallback
          : capturePersistedDeckPlaybackStateWithFallback,
        capturePersistedDeckPlaybackState: typeof nextOptions.capturePersistedDeckPlaybackState === 'function'
          ? nextOptions.capturePersistedDeckPlaybackState
          : capturePersistedDeckPlaybackState,
        ensurePersistedDeckPlaybackStateActiveSlideId: typeof nextOptions.ensurePersistedDeckPlaybackStateActiveSlideId === 'function'
          ? nextOptions.ensurePersistedDeckPlaybackStateActiveSlideId
          : ensurePersistedDeckPlaybackStateActiveSlideId,
        getSlides: typeof nextOptions.getSlides === 'function'
          ? nextOptions.getSlides
          : getSlides,
        slideIdAttr: typeof nextOptions.slideIdAttr === 'string'
          ? nextOptions.slideIdAttr
          : slideIdAttr,
        resolveFallbackActiveSlideId: typeof nextOptions.resolveFallbackActiveSlideId === 'function'
          ? nextOptions.resolveFallbackActiveSlideId
          : resolveFallbackActiveSlideId
      });
    };
  }

  function resolveStudioPersistableDeckStateWithContent(persistedDeckState = {}) {
    const nextPersistedDeckState = asPlainObject(persistedDeckState);
    return normalizeString(nextPersistedDeckState.cleanHtml) ? nextPersistedDeckState : null;
  }

  function resolveStudioCapturedPersistableDeckState(cleanHtml = '', options = {}) {
    const nextCleanHtml = normalizeString(cleanHtml);
    const resolvedCanonicalDeck = options.canonicalDeck || null;
    const resolvedPlaybackState = options.playbackState;
    const buildCanonicalDeck = typeof options.buildCanonicalDeck === 'function'
      ? options.buildCanonicalDeck
      : null;
    const resolvePlaybackState = typeof options.resolvePlaybackState === 'function'
      ? options.resolvePlaybackState
      : null;

    let canonicalDeck = resolvedCanonicalDeck;
    if (nextCleanHtml && !canonicalDeck && buildCanonicalDeck) {
      try {
        canonicalDeck = buildCanonicalDeck();
      } catch (err) {
        // Keep the clean HTML save path available for legacy decks.
        canonicalDeck = null;
      }
    }
    const playbackState = typeof resolvedPlaybackState !== 'undefined'
      ? resolvedPlaybackState
      : (resolvePlaybackState ? resolvePlaybackState(canonicalDeck) : null);

    return {
      cleanHtml: nextCleanHtml,
      playbackState,
      canonicalDeck
    };
  }

  function createStudioCapturedPersistableDeckStateResolver(options = {}) {
    const buildCanonicalDeck = typeof options.buildCanonicalDeck === 'function'
      ? options.buildCanonicalDeck
      : () => null;
    const resolvePlaybackState = typeof options.resolvePlaybackState === 'function'
      ? options.resolvePlaybackState
      : () => null;
    const resolveCapturedPersistableDeckState = typeof options.resolveCapturedPersistableDeckState === 'function'
      ? options.resolveCapturedPersistableDeckState
      : resolveStudioCapturedPersistableDeckState;

    return function resolveCapturedPersistableDeckStateWithDefaults(cleanHtml = '', nextOptions = {}) {
      return resolveCapturedPersistableDeckState(normalizeString(cleanHtml), {
        canonicalDeck: Object.prototype.hasOwnProperty.call(nextOptions, 'canonicalDeck')
          ? nextOptions.canonicalDeck
          : null,
        playbackState: Object.prototype.hasOwnProperty.call(nextOptions, 'playbackState')
          ? nextOptions.playbackState
          : undefined,
        buildCanonicalDeck: typeof nextOptions.buildCanonicalDeck === 'function'
          ? nextOptions.buildCanonicalDeck
          : buildCanonicalDeck,
        resolvePlaybackState: typeof nextOptions.resolvePlaybackState === 'function'
          ? nextOptions.resolvePlaybackState
          : resolvePlaybackState
      });
    };
  }

  function captureStudioPersistableDeckBuildState(doc = null, options = {}) {
    const nextOptions = options && typeof options === 'object'
      ? options
      : {};
    const buildPersistableDeckHtml = typeof nextOptions.buildPersistableDeckHtml === 'function'
      ? nextOptions.buildPersistableDeckHtml
      : () => '';
    const onCanonicalDeckResolved = typeof nextOptions.onCanonicalDeckResolved === 'function'
      ? nextOptions.onCanonicalDeckResolved
      : null;
    const onPlaybackStateResolved = typeof nextOptions.onPlaybackStateResolved === 'function'
      ? nextOptions.onPlaybackStateResolved
      : null;
    const {
      buildPersistableDeckHtml: ignoredBuildPersistableDeckHtml,
      ...persistableDeckBuildOptions
    } = nextOptions;
    let resolvedCanonicalDeck = null;
    let resolvedPlaybackState;
    const cleanHtml = buildPersistableDeckHtml(doc, {
      ...persistableDeckBuildOptions,
      onCanonicalDeckResolved(canonicalDeck) {
        resolvedCanonicalDeck = canonicalDeck;
        if (onCanonicalDeckResolved) {
          onCanonicalDeckResolved(canonicalDeck);
        }
      },
      onPlaybackStateResolved(playbackState) {
        resolvedPlaybackState = playbackState;
        if (onPlaybackStateResolved) {
          onPlaybackStateResolved(playbackState);
        }
      }
    });
    return {
      cleanHtml,
      canonicalDeck: resolvedCanonicalDeck,
      playbackState: resolvedPlaybackState
    };
  }

  function createStudioPersistableDeckBuildStateCapturer(options = {}) {
    const buildPersistableDeckHtml = typeof options.buildPersistableDeckHtml === 'function'
      ? options.buildPersistableDeckHtml
      : () => '';
    const capturePersistableDeckBuildState = typeof options.capturePersistableDeckBuildState === 'function'
      ? options.capturePersistableDeckBuildState
      : captureStudioPersistableDeckBuildState;

    return function capturePersistableDeckBuildStateWithDefaults(doc = null, nextOptions = {}) {
      return capturePersistableDeckBuildState(doc, {
        ...(nextOptions && typeof nextOptions === 'object'
          ? nextOptions
          : {}),
        buildPersistableDeckHtml: typeof nextOptions.buildPersistableDeckHtml === 'function'
          ? nextOptions.buildPersistableDeckHtml
          : buildPersistableDeckHtml
      });
    };
  }

  function captureStudioPersistableDeckState(doc = null, options = {}) {
    const captureBuildState = typeof options.captureBuildState === 'function'
      ? options.captureBuildState
      : () => ({ cleanHtml: '' });
    const providedCanonicalDeck = Object.prototype.hasOwnProperty.call(options, 'canonicalDeck')
      ? options.canonicalDeck
      : null;
    const capturedBuildState = captureBuildState(doc, {
      canonicalDeck: providedCanonicalDeck
    });

    return resolveStudioCapturedPersistableDeckState(
      typeof capturedBuildState.cleanHtml === 'string'
        ? capturedBuildState.cleanHtml
        : '',
      {
        canonicalDeck: Object.prototype.hasOwnProperty.call(capturedBuildState, 'canonicalDeck')
          ? capturedBuildState.canonicalDeck
          : null,
        playbackState: Object.prototype.hasOwnProperty.call(capturedBuildState, 'playbackState')
          ? capturedBuildState.playbackState
          : undefined,
        buildCanonicalDeck: options.buildCanonicalDeck,
        resolvePlaybackState: options.resolvePlaybackState
      }
    );
  }

  function createStudioPersistableDeckStateCapturer(options = {}) {
    const capturePersistableDeckState = typeof options.capturePersistableDeckState === 'function'
      ? options.capturePersistableDeckState
      : captureStudioPersistableDeckState;
    const captureBuildState = typeof options.captureBuildState === 'function'
      ? options.captureBuildState
      : null;
    const buildCanonicalDeck = typeof options.buildCanonicalDeck === 'function'
      ? options.buildCanonicalDeck
      : () => null;
    const resolvePlaybackState = typeof options.resolvePlaybackState === 'function'
      ? options.resolvePlaybackState
      : () => null;

    return function capturePersistableDeckStateWithDefaults(doc = null, nextOptions = {}) {
      return capturePersistableDeckState(doc, {
        canonicalDeck: Object.prototype.hasOwnProperty.call(nextOptions, 'canonicalDeck')
          ? nextOptions.canonicalDeck
          : null,
        captureBuildState: typeof nextOptions.captureBuildState === 'function'
          ? nextOptions.captureBuildState
          : captureBuildState,
        buildCanonicalDeck: typeof nextOptions.buildCanonicalDeck === 'function'
          ? nextOptions.buildCanonicalDeck
          : buildCanonicalDeck,
        resolvePlaybackState: typeof nextOptions.resolvePlaybackState === 'function'
          ? nextOptions.resolvePlaybackState
          : resolvePlaybackState
      });
    };
  }

  function areStudioPersistenceCanonicalDecksEqual(left, right, options = {}) {
    const areCanonicalDecksEqual = typeof options.areCanonicalDecksEqual === 'function'
      ? options.areCanonicalDecksEqual
      : (nextLeft, nextRight) => {
          if (nextLeft === nextRight) return true;
          if (!nextLeft || !nextRight) return !nextLeft && !nextRight;
          try {
            return JSON.stringify(nextLeft) === JSON.stringify(nextRight);
          } catch (err) {
            return false;
          }
        };

    return areCanonicalDecksEqual(left, right);
  }

  function resolveStudioPersistenceCanonicalDeck(deckLike = null, options = {}) {
    const resolvePresentationCanonicalDeck = typeof options.resolvePresentationCanonicalDeck === 'function'
      ? options.resolvePresentationCanonicalDeck
      : presentationMetadata && typeof presentationMetadata.resolvePresentationCanonicalDeck === 'function'
        ? presentationMetadata.resolvePresentationCanonicalDeck
        : null;
    if (resolvePresentationCanonicalDeck) {
      return resolvePresentationCanonicalDeck({ canonicalDeck: deckLike }, {
        createCanonicalDeck: options.createCanonicalDeck,
        isCanonicalDeck: options.isCanonicalDeck
      });
    }

    const canonicalDeck = asPlainObject(deckLike);
    const isCanonicalDeck = typeof options.isCanonicalDeck === 'function'
      ? options.isCanonicalDeck
      : () => true;
    return Array.isArray(canonicalDeck.slides) && isCanonicalDeck(canonicalDeck)
      ? canonicalDeck
      : null;
  }

  function resolveStudioSaveRequestCanonicalDeck(options = {}) {
    const isCanonicalDeck = typeof options.isCanonicalDeck === 'function'
      ? options.isCanonicalDeck
      : null;
    const getLiveCanonicalDeck = typeof options.getLiveCanonicalDeck === 'function'
      ? options.getLiveCanonicalDeck
      : null;
    const resolutionOptions = {
      createCanonicalDeck: options.createCanonicalDeck,
      isCanonicalDeck,
      resolvePresentationCanonicalDeck: options.resolvePresentationCanonicalDeck
    };
    const canonicalDeck = resolveStudioPersistenceCanonicalDeck(options.canonicalDeck, resolutionOptions);
    if (canonicalDeck) {
      return isCanonicalDeck && isCanonicalDeck(options.canonicalDeck)
        ? options.canonicalDeck
        : canonicalDeck;
    }

    if (getLiveCanonicalDeck) {
      let liveCanonicalDeck = null;
      try {
        liveCanonicalDeck = getLiveCanonicalDeck();
      } catch (err) {
        liveCanonicalDeck = null;
      }
      const resolvedLiveCanonicalDeck = resolveStudioPersistenceCanonicalDeck(
        liveCanonicalDeck,
        resolutionOptions
      );
      if (resolvedLiveCanonicalDeck) {
        return isCanonicalDeck && isCanonicalDeck(liveCanonicalDeck)
          ? liveCanonicalDeck
          : resolvedLiveCanonicalDeck;
      }
    }

    const buildCanonicalDeck = typeof options.buildCanonicalDeck === 'function'
      ? options.buildCanonicalDeck
      : null;
    if (!buildCanonicalDeck) {
      return null;
    }

    let fallbackCanonicalDeck = null;
    try {
      fallbackCanonicalDeck = buildCanonicalDeck();
    } catch (err) {
      return null;
    }
    const resolvedFallbackCanonicalDeck = resolveStudioPersistenceCanonicalDeck(
      fallbackCanonicalDeck,
      resolutionOptions
    );
    if (!resolvedFallbackCanonicalDeck) {
      return null;
    }

    return isCanonicalDeck && isCanonicalDeck(fallbackCanonicalDeck)
      ? fallbackCanonicalDeck
      : resolvedFallbackCanonicalDeck;
  }

  function resolveStudioCanonicalDeckOverride(options = {}) {
    const buildCanonicalDeck = typeof options.buildCanonicalDeck === 'function'
      ? options.buildCanonicalDeck
      : null;
    const isCanonicalDeck = typeof options.isCanonicalDeck === 'function'
      ? options.isCanonicalDeck
      : null;

    return resolveStudioSaveRequestCanonicalDeck({
      canonicalDeck: options.canonicalDeck,
      buildCanonicalDeck,
      createCanonicalDeck: options.createCanonicalDeck,
      isCanonicalDeck: isCanonicalDeck || isStructurallyValidStudioCanonicalDeck,
      resolvePresentationCanonicalDeck: options.resolvePresentationCanonicalDeck
    });
  }

  function resolveStudioFallbackCanonicalDeck(canonicalDeck = null, options = {}) {
    const buildCanonicalDeck = typeof options.buildCanonicalDeck === 'function'
      ? options.buildCanonicalDeck
      : null;
    const resolveCanonicalDeckOverride = typeof options.resolveCanonicalDeckOverride === 'function'
      ? options.resolveCanonicalDeckOverride
      : (nextCanonicalDeck, overrideOptions = {}) => resolveStudioCanonicalDeckOverride({
          canonicalDeck: nextCanonicalDeck,
          buildCanonicalDeck: overrideOptions.buildCanonicalDeck,
          createCanonicalDeck: options.createCanonicalDeck,
          isCanonicalDeck: options.isCanonicalDeck,
          resolvePresentationCanonicalDeck: options.resolvePresentationCanonicalDeck
        });
    const nextCanonicalDeck = resolveCanonicalDeckOverride(canonicalDeck, {
      buildCanonicalDeck: canonicalDeck && buildCanonicalDeck
        ? () => buildCanonicalDeck()
        : null
    });
    const hasValidCanonicalDeck = typeof options.isCanonicalDeck === 'function'
      ? options.isCanonicalDeck(nextCanonicalDeck)
      : !!(nextCanonicalDeck && Array.isArray(nextCanonicalDeck.slides));
    if (hasValidCanonicalDeck) {
      return nextCanonicalDeck;
    }

    return nextCanonicalDeck && buildCanonicalDeck
      ? buildCanonicalDeck()
      : null;
  }

  function createStudioFallbackCanonicalDeckResolver(options = {}) {
    return function resolveFallbackCanonicalDeck(canonicalDeck = null) {
      return resolveStudioFallbackCanonicalDeck(canonicalDeck, options);
    };
  }

  function createStudioPersistenceActionContext(presentationUrl = '', cleanHtml = '', options = {}) {
    const context = {
      presentationUrl: normalizeString(presentationUrl),
      cleanHtml: normalizeString(cleanHtml),
      shouldUpdatePersistedHtml: options.shouldUpdatePersistedHtml !== false
    };
    const canonicalDeck = resolveStudioPersistenceCanonicalDeck(options.canonicalDeck, {
      createCanonicalDeck: options.createCanonicalDeck,
      isCanonicalDeck: options.isCanonicalDeck,
      resolvePresentationCanonicalDeck: options.resolvePresentationCanonicalDeck
    });
    if (canonicalDeck) {
      context.canonicalDeck = canonicalDeck;
    }
    const sessionToken = normalizeSessionToken(options.sessionToken);
    if (sessionToken !== null) {
      context.sessionToken = sessionToken;
    }
    if (Object.prototype.hasOwnProperty.call(options, 'playbackState')) {
      context.playbackState = options.playbackState;
      context.shouldUpdatePersistedPlaybackState = options.shouldUpdatePersistedPlaybackState !== false;
    }
    return context;
  }

  function createStudioPersistedDeckStateActionContext(
    persistedDeckState = {},
    presentationUrl = '',
    options = {}
  ) {
    const nextPersistedDeckState = asPlainObject(persistedDeckState);
    const contextOptions = {
      ...options,
      canonicalDeck: nextPersistedDeckState.canonicalDeck
    };

    if (Object.prototype.hasOwnProperty.call(nextPersistedDeckState, 'playbackState')) {
      contextOptions.playbackState = nextPersistedDeckState.playbackState;
    }

    return createStudioPersistenceActionContext(
      presentationUrl,
      normalizeString(nextPersistedDeckState.cleanHtml),
      contextOptions
    );
  }

  function createStudioVersionPersistenceActionContext(presentationUrl = '', cleanHtml = '', options = {}) {
    return createStudioPersistenceActionContext(presentationUrl, cleanHtml, {
      ...options,
      shouldUpdatePersistedHtml: false,
      shouldUpdatePersistedPlaybackState: false
    });
  }

  function resolveStudioSaveRequestDeckState(doc = null, cleanHtml = null, options = {}) {
    const providedCanonicalDeck = Object.prototype.hasOwnProperty.call(options, 'canonicalDeck')
      ? options.canonicalDeck
      : null;
    const getLiveCanonicalDeck = typeof options.getLiveCanonicalDeck === 'function'
      ? options.getLiveCanonicalDeck
      : null;
    const capturePersistableDeckState = typeof options.capturePersistableDeckState === 'function'
      ? options.capturePersistableDeckState
      : null;
    const capturedDeckState = typeof cleanHtml === 'string' || !capturePersistableDeckState
      ? null
      : capturePersistableDeckState(doc, {
          canonicalDeck: providedCanonicalDeck
        });
    const resolveCanonicalDeck = typeof options.resolveCanonicalDeck === 'function'
      ? options.resolveCanonicalDeck
      : (canonicalDeck) => canonicalDeck || null;
    let liveCanonicalDeck = null;
    if (!providedCanonicalDeck && getLiveCanonicalDeck) {
      try {
        liveCanonicalDeck = getLiveCanonicalDeck();
      } catch (err) {
        liveCanonicalDeck = null;
      }
    }
    const resolvedCanonicalDeck = providedCanonicalDeck
      ? resolveCanonicalDeck(providedCanonicalDeck, doc, capturedDeckState)
      : liveCanonicalDeck
        || (capturedDeckState && capturedDeckState.canonicalDeck)
        || resolveCanonicalDeck(providedCanonicalDeck, doc, capturedDeckState);
    const buildPersistableDeckHtml = typeof options.buildPersistableDeckHtml === 'function'
      ? options.buildPersistableDeckHtml
      : () => cleanHtml;
    const resolvedCleanHtml = typeof cleanHtml === 'string'
      ? cleanHtml
      : capturedDeckState && typeof capturedDeckState.cleanHtml === 'string'
        ? capturedDeckState.cleanHtml
        : buildPersistableDeckHtml(doc, {
            canonicalDeck: resolvedCanonicalDeck
          });

    return {
      cleanHtml: normalizeString(resolvedCleanHtml),
      canonicalDeck: resolvedCanonicalDeck
    };
  }

  function buildStudioPersistableDeckSanitizerOptions(playbackState = null, options = {}) {
    const getDeckSanitizerOptions = typeof options.getDeckSanitizerOptions === 'function'
      ? options.getDeckSanitizerOptions
      : () => ({});
    const deckSanitizerOptions = getDeckSanitizerOptions() || {};
    const resolveMetadataPersistenceOptions = typeof options.resolveMetadataPersistenceOptions === 'function'
      ? options.resolveMetadataPersistenceOptions
      : () => ({});
    return {
      ...resolveMetadataPersistenceOptions(),
      editorChromeNodeIds: deckSanitizerOptions.chromeNodeIds,
      editorTransientClasses: deckSanitizerOptions.transientClassNames,
      editorElementIdAttr: deckSanitizerOptions.editorElementIdAttr,
      editorSlideIdAttr: deckSanitizerOptions.editorSlideIdAttr,
      persistedDeckPlaybackState: playbackState
    };
  }

  function createStudioPersistableDeckSanitizerOptionsBuilder(options = {}) {
    const resolveMetadataPersistenceOptions = typeof options.resolveMetadataPersistenceOptions === 'function'
      ? options.resolveMetadataPersistenceOptions
      : () => ({});
    const getDeckSanitizerOptions = typeof options.getDeckSanitizerOptions === 'function'
      ? options.getDeckSanitizerOptions
      : () => ({});
    const buildPersistableDeckSanitizerOptions = typeof options.buildPersistableDeckSanitizerOptions === 'function'
      ? options.buildPersistableDeckSanitizerOptions
      : buildStudioPersistableDeckSanitizerOptions;

    return function buildSanitizerOptions(playbackState = null, nextOptions = {}) {
      return buildPersistableDeckSanitizerOptions(playbackState, {
        resolveMetadataPersistenceOptions: typeof nextOptions.resolveMetadataPersistenceOptions === 'function'
          ? nextOptions.resolveMetadataPersistenceOptions
          : resolveMetadataPersistenceOptions,
        getDeckSanitizerOptions: typeof nextOptions.getDeckSanitizerOptions === 'function'
          ? nextOptions.getDeckSanitizerOptions
          : getDeckSanitizerOptions
      });
    };
  }

  function sanitizeStudioReusablePersistedHtml(persistedHtml, options = {}) {
    const nextPersistedHtml = normalizeString(persistedHtml);
    const buildPersistableDeckHtml = typeof options.buildPersistableDeckHtml === 'function'
      ? options.buildPersistableDeckHtml
      : null;
    if (!nextPersistedHtml || !buildPersistableDeckHtml) {
      return nextPersistedHtml;
    }

    const parseHtml = typeof options.parseHtml === 'function'
      ? options.parseHtml
      : (() => {
          const DOMParserConstructor = typeof options.DOMParser === 'function'
            ? options.DOMParser
            : typeof DOMParser === 'function'
              ? DOMParser
              : null;
          if (!DOMParserConstructor) {
            return null;
          }
          return new DOMParserConstructor().parseFromString(nextPersistedHtml, 'text/html');
        });
    if (!parseHtml) {
      return nextPersistedHtml;
    }

    try {
      const parsedDoc = parseHtml(nextPersistedHtml);
      if (!parsedDoc || !parsedDoc.documentElement) {
        return nextPersistedHtml;
      }
      const buildPersistableDeckSanitizerOptions = typeof options.buildPersistableDeckSanitizerOptions === 'function'
        ? options.buildPersistableDeckSanitizerOptions
        : (playbackState, buildOptions = {}) => buildStudioPersistableDeckSanitizerOptions(playbackState, buildOptions);
      const persistableDeckSanitizerOptions = buildPersistableDeckSanitizerOptions(
        Object.prototype.hasOwnProperty.call(options, 'playbackState')
          ? options.playbackState
          : null,
        {
          resolveMetadataPersistenceOptions: options.resolveMetadataPersistenceOptions,
          getDeckSanitizerOptions: options.getDeckSanitizerOptions
        }
      );
      return buildPersistableDeckHtml(parsedDoc, {
        ...persistableDeckSanitizerOptions
      });
    } catch (err) {
      return nextPersistedHtml;
    }
  }

  function buildStudioPersistableDeckHtmlWithoutDocument(options = {}) {
    const getPersistedDeckState = typeof options.getPersistedDeckState === 'function'
      ? options.getPersistedDeckState
      : () => options.persistedDeckState || {};
    const persistedDeckState = getPersistedDeckState() || {};
    const resolvePersistedDeckStateWithContent = typeof options.resolvePersistedDeckStateWithContent === 'function'
      ? options.resolvePersistedDeckStateWithContent
      : resolveStudioPersistableDeckStateWithContent;
    const persistedDeckStateWithContent = resolvePersistedDeckStateWithContent(persistedDeckState);
    const persistedHtml = persistedDeckStateWithContent
      ? normalizeString(persistedDeckStateWithContent.cleanHtml)
      : '';
    const resolveCanonicalDeck = typeof options.resolveCanonicalDeck === 'function'
      ? options.resolveCanonicalDeck
      : () => null;
    const canonicalDeck = resolveCanonicalDeck(persistedDeckState, persistedDeckStateWithContent);
    if (typeof options.onCanonicalDeckResolved === 'function') {
      options.onCanonicalDeckResolved(canonicalDeck);
    }

    const playbackState = Object.prototype.hasOwnProperty.call(persistedDeckState, 'playbackState')
      ? persistedDeckState.playbackState
      : null;
    if (typeof options.onPlaybackStateResolved === 'function') {
      options.onPlaybackStateResolved(playbackState);
    }

    const resolveReusablePersistedHtml = typeof options.resolveReusablePersistedHtml === 'function'
      ? options.resolveReusablePersistedHtml
      : () => '';
    const reusablePersistedHtml = resolveReusablePersistedHtml(
      persistedDeckStateWithContent || persistedDeckState,
      {
        canonicalDeck,
        persistedHtml,
        persistedCanonicalDeck: persistedDeckState.canonicalDeck || null
      }
    );
    if (reusablePersistedHtml) {
      const sanitizeReusablePersistedHtml = typeof options.sanitizeReusablePersistedHtml === 'function'
        ? options.sanitizeReusablePersistedHtml
        : (nextPersistedHtml) => nextPersistedHtml;
      return sanitizeReusablePersistedHtml(reusablePersistedHtml, {
        playbackState
      });
    }

    const buildSourceDeckHtml = typeof options.buildSourceDeckHtml === 'function'
      ? options.buildSourceDeckHtml
      : () => persistedHtml;
    return buildSourceDeckHtml({
      canonicalDeck,
      persistedHtml,
      persistedDeckState,
      persistedDeckStateWithContent,
      playbackState
    });
  }

  function buildStudioPersistableDeckHtmlFromDocument(doc, options = {}) {
    const shouldReportCanonicalDeck = typeof options.onCanonicalDeckResolved === 'function';
    const resolveCanonicalDeck = typeof options.resolveCanonicalDeck === 'function'
      ? options.resolveCanonicalDeck
      : () => null;
    const canonicalDeck = resolveCanonicalDeck(shouldReportCanonicalDeck);
    const resolvePlaybackState = typeof options.resolvePlaybackState === 'function'
      ? options.resolvePlaybackState
      : () => null;
    const playbackState = resolvePlaybackState(canonicalDeck);
    if (typeof options.onCanonicalDeckResolved === 'function') {
      options.onCanonicalDeckResolved(canonicalDeck);
    }
    if (typeof options.onPlaybackStateResolved === 'function') {
      options.onPlaybackStateResolved(playbackState);
    }

    const buildPersistableDeckSanitizerOptions = typeof options.buildPersistableDeckSanitizerOptions === 'function'
      ? options.buildPersistableDeckSanitizerOptions
      : () => ({});
    const persistableDeckSanitizerOptions = buildPersistableDeckSanitizerOptions(playbackState);
    const buildPersistableDeckHtml = typeof options.buildPersistableDeckHtml === 'function'
      ? options.buildPersistableDeckHtml
      : () => '';
    return buildPersistableDeckHtml(doc, {
      ...persistableDeckSanitizerOptions
    });
  }

  function buildStudioSaveRequestBody(presentationUrl = '', cleanHtml = '', options = {}) {
    const body = {
      htmlPath: normalizeString(presentationUrl),
      htmlContent: normalizeString(cleanHtml),
      isAutoSave: !!options.isAutoSave
    };
    const versionLabel = normalizeString(options.versionLabel);
    if (versionLabel) {
      body.versionLabel = versionLabel;
    }

    const hasCanonicalDeckOption = Object.prototype.hasOwnProperty.call(options, 'canonicalDeck');
    const canonicalDeck = hasCanonicalDeckOption && options.canonicalDeck === null
      ? null
      : resolveStudioSaveRequestCanonicalDeck(options);
    if (canonicalDeck || (hasCanonicalDeckOption && options.canonicalDeck === null)) {
      body.canonicalDeck = canonicalDeck;
    }

    return body;
  }

  function createStudioSaveRequestBodyBuilder(options = {}) {
    const getPresentationUrl = typeof options.getPresentationUrl === 'function'
      ? options.getPresentationUrl
      : () => normalizeString(options.presentationUrl);
    const resolveSaveRequestDeckState = typeof options.resolveSaveRequestDeckState === 'function'
      ? options.resolveSaveRequestDeckState
      : resolveStudioSaveRequestDeckState;
    const buildSaveRequestBody = typeof options.buildSaveRequestBody === 'function'
      ? options.buildSaveRequestBody
      : buildStudioSaveRequestBody;
    const capturePersistableDeckState = typeof options.capturePersistableDeckState === 'function'
      ? options.capturePersistableDeckState
      : null;
    const getLiveCanonicalDeck = typeof options.getLiveCanonicalDeck === 'function'
      ? options.getLiveCanonicalDeck
      : null;
    const resolveCanonicalDeck = typeof options.resolveCanonicalDeck === 'function'
      ? options.resolveCanonicalDeck
      : (canonicalDeck) => canonicalDeck || null;
    const buildPersistableDeckHtml = typeof options.buildPersistableDeckHtml === 'function'
      ? options.buildPersistableDeckHtml
      : () => '';

    return function buildSaveRequestBodyWithDefaults(doc = null, cleanHtml = null, nextOptions = {}) {
      const presentationUrl = Object.prototype.hasOwnProperty.call(nextOptions, 'presentationUrl')
        ? nextOptions.presentationUrl
        : getPresentationUrl();
      const canonicalDeck = Object.prototype.hasOwnProperty.call(nextOptions, 'canonicalDeck')
        ? nextOptions.canonicalDeck
        : null;
      const resolvedDeckState = resolveSaveRequestDeckState(doc, cleanHtml, {
        canonicalDeck,
        capturePersistableDeckState: typeof nextOptions.capturePersistableDeckState === 'function'
          ? nextOptions.capturePersistableDeckState
          : capturePersistableDeckState,
        getLiveCanonicalDeck: typeof nextOptions.getLiveCanonicalDeck === 'function'
          ? nextOptions.getLiveCanonicalDeck
          : getLiveCanonicalDeck,
        resolveCanonicalDeck: typeof nextOptions.resolveCanonicalDeck === 'function'
          ? nextOptions.resolveCanonicalDeck
          : resolveCanonicalDeck,
        buildPersistableDeckHtml: typeof nextOptions.buildPersistableDeckHtml === 'function'
          ? nextOptions.buildPersistableDeckHtml
          : buildPersistableDeckHtml
      });
      const saveRequestOptions = {
        isAutoSave: !!nextOptions.isAutoSave,
        versionLabel: nextOptions.versionLabel,
        canonicalDeck: resolvedDeckState.canonicalDeck
      };
      const resolvedLiveCanonicalDeckReader = typeof nextOptions.getLiveCanonicalDeck === 'function'
        ? nextOptions.getLiveCanonicalDeck
        : getLiveCanonicalDeck;
      if (resolvedLiveCanonicalDeckReader) {
        saveRequestOptions.getLiveCanonicalDeck = resolvedLiveCanonicalDeckReader;
      }
      return buildSaveRequestBody(presentationUrl, resolvedDeckState.cleanHtml, saveRequestOptions);
    };
  }

  function buildStudioPersistenceRequestPlan(presentationUrl = '', cleanHtml = '', options = {}) {
    const isPersistedState = typeof options.isPersistedState === 'function'
      ? options.isPersistedState
      : null;
    const buildSaveRequestBody = typeof options.buildSaveRequestBody === 'function'
      ? options.buildSaveRequestBody
      : null;
    const tentativeSaveRequestBody = isPersistedState && buildSaveRequestBody
      ? buildSaveRequestBody(cleanHtml)
      : null;
    const hasPersistedCurrentState = isPersistedState
      ? !!isPersistedState(tentativeSaveRequestBody, cleanHtml)
      : typeof options.isPersistedHtml === 'function'
        ? !!options.isPersistedHtml(cleanHtml)
        : false;
    const saveRequestBody = hasPersistedCurrentState
      ? null
      : tentativeSaveRequestBody || (buildSaveRequestBody ? buildSaveRequestBody(cleanHtml) : null);

    const persistenceContextOptions = {
      shouldUpdatePersistedHtml: !hasPersistedCurrentState,
      canonicalDeck: saveRequestBody && saveRequestBody.canonicalDeck,
      sessionToken: options.sessionToken,
      createCanonicalDeck: options.createCanonicalDeck,
      isCanonicalDeck: options.isCanonicalDeck,
      resolvePresentationCanonicalDeck: options.resolvePresentationCanonicalDeck
    };
    if (Object.prototype.hasOwnProperty.call(options, 'playbackState')) {
      persistenceContextOptions.playbackState = options.playbackState;
      persistenceContextOptions.shouldUpdatePersistedPlaybackState = options.shouldUpdatePersistedPlaybackState !== false;
    }

    return {
      hasPersistedCurrentHtml: hasPersistedCurrentState,
      hasPersistedCurrentState,
      saveRequestBody,
      persistenceContext: createStudioPersistenceActionContext(
        presentationUrl,
        cleanHtml,
        persistenceContextOptions
      )
    };
  }

  function buildStudioAutoSavePersistencePlan(persistedDeckState = {}, presentationUrl = '', options = {}) {
    const nextPersistedDeckState = asPlainObject(persistedDeckState);
    const cleanHtml = normalizeString(nextPersistedDeckState.cleanHtml);
    const buildSaveRequestBody = typeof options.buildSaveRequestBody === 'function'
      ? options.buildSaveRequestBody
      : null;
    const requestPlanOptions = {
      isPersistedState: options.isPersistedState,
      buildSaveRequestBody: buildSaveRequestBody
        ? () => buildSaveRequestBody(nextPersistedDeckState.doc, cleanHtml, {
            presentationUrl,
            isAutoSave: true,
            canonicalDeck: nextPersistedDeckState.canonicalDeck
          })
        : null,
      sessionToken: options.sessionToken,
      shouldUpdatePersistedPlaybackState: !!nextPersistedDeckState.doc
    };

    if (Object.prototype.hasOwnProperty.call(nextPersistedDeckState, 'playbackState')) {
      requestPlanOptions.playbackState = nextPersistedDeckState.playbackState;
    }

    return buildStudioPersistenceRequestPlan(
      presentationUrl,
      cleanHtml,
      requestPlanOptions
    );
  }

  function createStudioAutoSavePersistenceState(
    persistedDeckState = {},
    presentationUrl = '',
    options = {}
  ) {
    const nextPersistedDeckState = asPlainObject(persistedDeckState);
    return {
      persistedDeckState: nextPersistedDeckState,
      persistencePlan: buildStudioAutoSavePersistencePlan(
        nextPersistedDeckState,
        presentationUrl,
        options
      )
    };
  }

  function resolveStudioPersistenceStateWithContent(
    persistedDeckState = {},
    presentationUrl = '',
    options = {},
    createPersistenceState = null
  ) {
    const nextPersistedDeckState = resolveStudioPersistableDeckStateWithContent(persistedDeckState);
    if (!nextPersistedDeckState || typeof createPersistenceState !== 'function') {
      return null;
    }

    return createPersistenceState(
      nextPersistedDeckState,
      presentationUrl,
      options
    );
  }

  function resolveStudioPersistenceStateFromCapture(
    doc = null,
    capturedDeckState = {},
    presentationUrl = '',
    options = {},
    resolvePersistenceState = null
  ) {
    if (typeof resolvePersistenceState !== 'function') {
      return null;
    }

    return resolvePersistenceState(
      createStudioPersistableDeckState(doc, capturedDeckState),
      presentationUrl,
      options
    );
  }

  function resolveStudioPersistenceStateFromDocumentCapture(
    doc = null,
    presentationUrl = '',
    options = {},
    resolvePersistenceStateFromCapture = null
  ) {
    const capturePersistableDeckState = typeof options.capturePersistableDeckState === 'function'
      ? options.capturePersistableDeckState
      : null;
    if (!capturePersistableDeckState || typeof resolvePersistenceStateFromCapture !== 'function') {
      return null;
    }

    return resolvePersistenceStateFromCapture(
      doc,
      capturePersistableDeckState(doc),
      presentationUrl,
      asPlainObject(options.persistenceOptions)
    );
  }

  function createStudioPersistenceStateFromDocumentCaptureResolver(options = {}) {
    const getPresentationUrl = typeof options.getPresentationUrl === 'function'
      ? options.getPresentationUrl
      : () => normalizeString(options.presentationUrl);
    const capturePersistableDeckState = typeof options.capturePersistableDeckState === 'function'
      ? options.capturePersistableDeckState
      : null;
    const resolvePersistenceStateFromDocumentCapture = typeof options.resolvePersistenceStateFromDocumentCapture === 'function'
      ? options.resolvePersistenceStateFromDocumentCapture
      : resolveStudioPersistenceStateFromDocumentCapture;

    return function resolvePersistenceStateFromCapture(doc = null, nextOptions = {}) {
      const resolveFromCapture = typeof nextOptions.resolvePersistenceStateFromCapture === 'function'
        ? nextOptions.resolvePersistenceStateFromCapture
        : null;
      if (!resolveFromCapture) {
        return null;
      }
      return resolvePersistenceStateFromDocumentCapture(
        doc,
        typeof nextOptions.presentationUrl === 'string' && nextOptions.presentationUrl
          ? nextOptions.presentationUrl
          : getPresentationUrl(),
        {
          capturePersistableDeckState: typeof nextOptions.capturePersistableDeckState === 'function'
            ? nextOptions.capturePersistableDeckState
            : capturePersistableDeckState,
          persistenceOptions: nextOptions.persistenceOptions && typeof nextOptions.persistenceOptions === 'object' && !Array.isArray(nextOptions.persistenceOptions)
            ? { ...nextOptions.persistenceOptions }
            : {}
        },
        resolveFromCapture
      );
    };
  }

  function resolveStudioAutoSavePersistenceState(
    persistedDeckState = {},
    presentationUrl = '',
    options = {}
  ) {
    return resolveStudioPersistenceStateWithContent(
      persistedDeckState,
      presentationUrl,
      options,
      createStudioAutoSavePersistenceState
    );
  }

  function resolveStudioAutoSavePersistenceStateFromCapture(
    doc = null,
    capturedDeckState = {},
    presentationUrl = '',
    options = {}
  ) {
    return resolveStudioPersistenceStateFromCapture(
      doc,
      capturedDeckState,
      presentationUrl,
      options,
      resolveStudioAutoSavePersistenceState
    );
  }

  function createStudioAutoSaveRequest(persistencePlan = {}) {
    return {
      url: '/api/save',
      body: persistencePlan && persistencePlan.saveRequestBody
    };
  }

  async function executeStudioAutoSavePersistenceRequest(persistencePlan = {}, options = {}) {
    const autoSaveRequest = createStudioAutoSaveRequest(persistencePlan);
    return executeStudioPersistenceRequest(
      autoSaveRequest,
      {
        fetchImpl: options.fetchImpl
      }
    );
  }

  async function executeStudioAutoSavePersistenceRequestWithHandlers(
    autoSavePersistenceState = null,
    options = {}
  ) {
    if (!autoSavePersistenceState || !autoSavePersistenceState.persistencePlan) {
      return null;
    }

    const { persistencePlan } = autoSavePersistenceState;
    const data = await executeStudioAutoSavePersistenceRequest(
      persistencePlan,
      {
        fetchImpl: options.fetchImpl
      }
    );
    const applyPersistenceSuccess = typeof options.applyPersistenceSuccess === 'function'
      ? options.applyPersistenceSuccess
      : null;
    const applyPersistenceFailure = typeof options.applyPersistenceFailure === 'function'
      ? options.applyPersistenceFailure
      : null;

    if (data && data.success) {
      if (applyPersistenceSuccess) {
        applyPersistenceSuccess(
          persistencePlan.persistenceContext,
          asPlainObject(options.successOptions)
        );
      }
    } else if (applyPersistenceFailure) {
      applyPersistenceFailure(
        persistencePlan.persistenceContext,
        asPlainObject(options.failureOptions)
      );
    }

    return {
      data,
      autoSavePersistenceState
    };
  }

  async function executeStudioPersistenceRequest(request = {}, options = {}) {
    const fetchImpl = typeof options.fetchImpl === 'function'
      ? options.fetchImpl
      : typeof fetch === 'function'
        ? fetch
        : null;
    if (!fetchImpl) {
      throw new TypeError('A fetch implementation is required to execute studio persistence requests.');
    }

    const response = await fetchImpl(normalizeString(request.url), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request && request.body)
    });
    return response.json();
  }

  function buildStudioVersionCheckpointPersistencePlan(
    versionLabel = '',
    cleanHtml = '',
    presentationUrl = '',
    options = {}
  ) {
    const buildSaveRequestBody = typeof options.buildSaveRequestBody === 'function'
      ? options.buildSaveRequestBody
      : null;
    const resolvePlaybackState = typeof options.resolvePlaybackState === 'function'
      ? options.resolvePlaybackState
      : null;
    const requestPlanOptions = {
      isPersistedState: options.isPersistedState,
      buildSaveRequestBody: buildSaveRequestBody
        ? () => buildSaveRequestBody(options.doc, cleanHtml, {
            presentationUrl,
            versionLabel,
            canonicalDeck: options.canonicalDeck
          })
        : null,
      sessionToken: options.sessionToken,
      playbackState: Object.prototype.hasOwnProperty.call(options, 'playbackState')
        ? options.playbackState
        : resolvePlaybackState
          ? resolvePlaybackState(options.doc, options.canonicalDeck)
          : null,
      shouldUpdatePersistedPlaybackState: !!options.doc
    };

    return buildStudioPersistenceRequestPlan(
      presentationUrl,
      cleanHtml,
      requestPlanOptions
    );
  }

  function createStudioVersionCheckpointRequest(versionLabel = '', presentationUrl = '', persistencePlan = {}) {
    const hasPersistedCurrentState = !!(persistencePlan && persistencePlan.hasPersistedCurrentState);
    return {
      url: hasPersistedCurrentState ? '/api/versions/create' : '/api/save',
      body: hasPersistedCurrentState
        ? {
            htmlPath: normalizeString(presentationUrl),
            versionLabel: normalizeString(versionLabel)
          }
        : persistencePlan && persistencePlan.saveRequestBody
    };
  }

  async function executeStudioVersionCheckpointPersistenceRequest(
    versionLabel = '',
    cleanHtml = '',
    presentationUrl = '',
    options = {}
  ) {
    const persistencePlan = buildStudioVersionCheckpointPersistencePlan(
      versionLabel,
      cleanHtml,
      presentationUrl,
      options
    );
    const versionCheckpointRequest = createStudioVersionCheckpointRequest(
      versionLabel,
      presentationUrl,
      persistencePlan
    );
    const data = await executeStudioPersistenceRequest(
      versionCheckpointRequest,
      {
        fetchImpl: options.fetchImpl
      }
    );

    return {
      data,
      persistencePlan
    };
  }

  async function executeStudioVersionCheckpointPersistenceRequestWithSuccess(
    versionLabel = '',
    cleanHtml = '',
    presentationUrl = '',
    options = {}
  ) {
    const versionCheckpointResult = await executeStudioVersionCheckpointPersistenceRequest(
      versionLabel,
      cleanHtml,
      presentationUrl,
      options
    );
    const applyPersistenceSuccess = typeof options.applyPersistenceSuccess === 'function'
      ? options.applyPersistenceSuccess
      : null;

    if (
      applyPersistenceSuccess
      && versionCheckpointResult
      && versionCheckpointResult.data
      && versionCheckpointResult.data.success
      && versionCheckpointResult.persistencePlan
      && versionCheckpointResult.persistencePlan.persistenceContext
    ) {
      applyPersistenceSuccess(
        versionCheckpointResult.persistencePlan.persistenceContext,
        asPlainObject(options.successOptions)
      );
    }

    return versionCheckpointResult;
  }

  async function executeStudioVersionCheckpointSave(
    versionLabel = '',
    versionCheckpointPersistenceState = null,
    presentationUrl = '',
    options = {}
  ) {
    const saveVersionCheckpoint = typeof options.saveVersionCheckpoint === 'function'
      ? options.saveVersionCheckpoint
      : null;
    if (!versionCheckpointPersistenceState || !saveVersionCheckpoint) {
      return null;
    }

    const data = await saveVersionCheckpoint(
      versionLabel,
      normalizeString(versionCheckpointPersistenceState.cleanHtml),
      presentationUrl,
      versionCheckpointPersistenceState.requestOptions
    );

    return {
      data,
      versionCheckpointPersistenceState
    };
  }

  async function executeStudioVersionCheckpointSaveWithSuccess(
    versionLabel = '',
    versionCheckpointPersistenceState = null,
    presentationUrl = '',
    options = {}
  ) {
    const versionCheckpointSaveResult = await executeStudioVersionCheckpointSave(
      versionLabel,
      versionCheckpointPersistenceState,
      presentationUrl,
      {
        saveVersionCheckpoint: options.saveVersionCheckpoint
      }
    );
    const applyVersionCheckpointSaveSuccess = typeof options.applyVersionCheckpointSaveSuccess === 'function'
      ? options.applyVersionCheckpointSaveSuccess
      : null;
    if (
      applyVersionCheckpointSaveSuccess
      && versionCheckpointSaveResult
      && versionCheckpointSaveResult.data
      && versionCheckpointSaveResult.data.success
    ) {
      applyVersionCheckpointSaveSuccess(
        versionCheckpointSaveResult.versionCheckpointPersistenceState || versionCheckpointPersistenceState,
        asPlainObject(options.successOptions)
      );
    }
    return versionCheckpointSaveResult;
  }

  async function executeStudioVersionCheckpointSaveWithFailure(
    versionLabel = '',
    versionCheckpointPersistenceState = null,
    presentationUrl = '',
    options = {}
  ) {
    const versionCheckpointSaveResult = await executeStudioVersionCheckpointSaveWithSuccess(
      versionLabel,
      versionCheckpointPersistenceState,
      presentationUrl,
      {
        saveVersionCheckpoint: options.saveVersionCheckpoint,
        applyVersionCheckpointSaveSuccess: options.applyVersionCheckpointSaveSuccess,
        successOptions: options.successOptions
      }
    );
    const applyPersistenceFailure = typeof options.applyPersistenceFailure === 'function'
      ? options.applyPersistenceFailure
      : null;
    const buildFailureOptions = typeof options.buildFailureOptions === 'function'
      ? options.buildFailureOptions
      : null;
    const failureContext = versionCheckpointSaveResult
      && versionCheckpointSaveResult.versionCheckpointPersistenceState
      && versionCheckpointSaveResult.versionCheckpointPersistenceState.persistenceContext
        ? versionCheckpointSaveResult.versionCheckpointPersistenceState.persistenceContext
        : versionCheckpointPersistenceState && versionCheckpointPersistenceState.persistenceContext;

    if (
      applyPersistenceFailure
      && versionCheckpointSaveResult
      && versionCheckpointSaveResult.data
      && !versionCheckpointSaveResult.data.success
      && failureContext
    ) {
      applyPersistenceFailure(
        failureContext,
        buildFailureOptions
          ? asPlainObject(buildFailureOptions(versionCheckpointSaveResult.data))
          : asPlainObject(options.failureOptions)
      );
    }

    return versionCheckpointSaveResult;
  }

  function isStudioVersionCheckpointSavePersisted(
    versionLabel = '',
    versionCheckpointPersistenceState = null,
    presentationUrl = '',
    options = {}
  ) {
    if (!versionCheckpointPersistenceState) {
      return false;
    }

    const persistencePlan = buildStudioVersionCheckpointPersistencePlan(
      versionLabel,
      normalizeString(versionCheckpointPersistenceState.cleanHtml),
      presentationUrl,
      {
        ...asPlainObject(versionCheckpointPersistenceState.requestOptions),
        isPersistedState: options.isPersistedState,
        buildSaveRequestBody: options.buildSaveRequestBody
      }
    );

    return !!(persistencePlan && persistencePlan.hasPersistedCurrentState);
  }

  function createStudioVersionCheckpointRequestOptions(persistedDeckState = {}, options = {}) {
    const nextPersistedDeckState = asPlainObject(persistedDeckState);
    const requestOptions = {
      doc: nextPersistedDeckState.doc,
      canonicalDeck: nextPersistedDeckState.canonicalDeck
    };
    const sessionToken = normalizeSessionToken(options.sessionToken);
    if (sessionToken !== null) {
      requestOptions.sessionToken = sessionToken;
    }
    if (Object.prototype.hasOwnProperty.call(nextPersistedDeckState, 'playbackState')) {
      requestOptions.playbackState = nextPersistedDeckState.playbackState;
    }
    return requestOptions;
  }

  function createStudioVersionCheckpointPersistenceState(
    persistedDeckState = {},
    presentationUrl = '',
    options = {}
  ) {
    const nextPersistedDeckState = asPlainObject(persistedDeckState);
    const cleanHtml = normalizeString(nextPersistedDeckState.cleanHtml);
    const sessionToken = normalizeSessionToken(options.sessionToken);
    return {
      cleanHtml,
      persistenceContext: createStudioVersionPersistenceActionContext(
        presentationUrl,
        cleanHtml,
        { sessionToken }
      ),
      requestOptions: createStudioVersionCheckpointRequestOptions(
        nextPersistedDeckState,
        { sessionToken }
      )
    };
  }

  function resolveStudioVersionCheckpointPersistenceState(
    persistedDeckState = {},
    presentationUrl = '',
    options = {}
  ) {
    return resolveStudioPersistenceStateWithContent(
      persistedDeckState,
      presentationUrl,
      options,
      createStudioVersionCheckpointPersistenceState
    );
  }

  function resolveStudioVersionCheckpointPersistenceStateFromCapture(
    doc = null,
    capturedDeckState = {},
    presentationUrl = '',
    options = {}
  ) {
    return resolveStudioPersistenceStateFromCapture(
      doc,
      capturedDeckState,
      presentationUrl,
      options,
      resolveStudioVersionCheckpointPersistenceState
    );
  }

  function isStudioPersistedHtml(cleanHtml = '', persistedHtml = '') {
    return !!normalizeString(persistedHtml) && normalizeString(cleanHtml) === normalizeString(persistedHtml);
  }

  function isStudioPersistedCanonicalDeck(canonicalDeck, persistedCanonicalDeck, options = {}) {
    const nextCanonicalDeck = resolveStudioPersistenceCanonicalDeck(canonicalDeck, options);
    if (!nextCanonicalDeck) {
      return true;
    }

    const nextPersistedCanonicalDeck = resolveStudioPersistenceCanonicalDeck(persistedCanonicalDeck, options);
    if (!nextPersistedCanonicalDeck) {
      return false;
    }

    return areStudioPersistenceCanonicalDecksEqual(nextCanonicalDeck, nextPersistedCanonicalDeck, options);
  }

  function resolveStudioPersistedHtmlReuse(persistedDeckState = {}, options = {}) {
    const nextPersistedDeckState = resolveStudioPersistableDeckStateWithContent(persistedDeckState);
    if (!nextPersistedDeckState) {
      return '';
    }
    const persistedHtml = normalizeString(nextPersistedDeckState.cleanHtml);
    if (!persistedHtml.trim()) {
      return '';
    }

    return isStudioPersistedCanonicalDeck(
      options.canonicalDeck,
      nextPersistedDeckState.canonicalDeck,
      options
    )
      ? persistedHtml
      : '';
  }

  function resolveStudioReusablePersistedHtml(persistedDeckState = {}, options = {}) {
    const nextPersistedDeckState = asPlainObject(persistedDeckState);
    const persistedHtml = typeof options.persistedHtml === 'string'
      ? options.persistedHtml
      : normalizeString(nextPersistedDeckState.cleanHtml);
    const canonicalDeck = Object.prototype.hasOwnProperty.call(options, 'canonicalDeck')
      ? options.canonicalDeck
      : null;
    const persistedCanonicalDeck = Object.prototype.hasOwnProperty.call(options, 'persistedCanonicalDeck')
      ? options.persistedCanonicalDeck
      : (nextPersistedDeckState.canonicalDeck || null);
    const resolvePersistedHtmlReuse = Object.prototype.hasOwnProperty.call(options, 'resolvePersistedHtmlReuse')
      ? (typeof options.resolvePersistedHtmlReuse === 'function' ? options.resolvePersistedHtmlReuse : null)
      : resolveStudioPersistedHtmlReuse;
    const isPersistedCanonicalDeck = typeof options.isPersistedCanonicalDeck === 'function'
      ? options.isPersistedCanonicalDeck
      : isStudioPersistedCanonicalDeck;

    return resolvePersistedHtmlReuse
      ? resolvePersistedHtmlReuse(nextPersistedDeckState, { canonicalDeck })
      : (persistedHtml.trim() && isPersistedCanonicalDeck(canonicalDeck, persistedCanonicalDeck, options)
          ? persistedHtml
      : '');
  }

  function createStudioReusablePersistedHtmlResolver(options = {}) {
    const resolveReusablePersistedHtml = typeof options.resolveReusablePersistedHtml === 'function'
      ? options.resolveReusablePersistedHtml
      : resolveStudioReusablePersistedHtml;
    const resolvePersistedHtmlReuse = typeof options.resolvePersistedHtmlReuse === 'function'
      ? options.resolvePersistedHtmlReuse
      : null;
    const isPersistedCanonicalDeck = typeof options.isPersistedCanonicalDeck === 'function'
      ? options.isPersistedCanonicalDeck
      : null;

    return function resolveReusablePersistedHtmlWithDefaults(persistedDeckState = {}, nextOptions = {}) {
      return resolveReusablePersistedHtml(persistedDeckState, {
        persistedHtml: typeof nextOptions.persistedHtml === 'string'
          ? nextOptions.persistedHtml
          : undefined,
        canonicalDeck: Object.prototype.hasOwnProperty.call(nextOptions, 'canonicalDeck')
          ? nextOptions.canonicalDeck
          : null,
        persistedCanonicalDeck: Object.prototype.hasOwnProperty.call(nextOptions, 'persistedCanonicalDeck')
          ? nextOptions.persistedCanonicalDeck
          : undefined,
        resolvePersistedHtmlReuse: typeof nextOptions.resolvePersistedHtmlReuse === 'function'
          ? nextOptions.resolvePersistedHtmlReuse
          : resolvePersistedHtmlReuse,
        isPersistedCanonicalDeck: typeof nextOptions.isPersistedCanonicalDeck === 'function'
          ? nextOptions.isPersistedCanonicalDeck
          : isPersistedCanonicalDeck
      });
    };
  }

  function resolveStudioMetadataPersistenceOptions(options = {}) {
    const activePresentationMetadata = Object.prototype.hasOwnProperty.call(options, 'currentPresentationMetadata')
      ? options.currentPresentationMetadata
      : null;
    const explicitPersistenceOptions = options.persistenceOptions
      && typeof options.persistenceOptions === 'object'
      && !Array.isArray(options.persistenceOptions)
      ? { ...options.persistenceOptions }
      : {};
    const resolveMergedPresentationPersistenceOptions = typeof options.resolveMergedPresentationPersistenceOptions === 'function'
      ? options.resolveMergedPresentationPersistenceOptions
      : null;
    if (resolveMergedPresentationPersistenceOptions) {
      return resolveMergedPresentationPersistenceOptions(activePresentationMetadata || {}, explicitPersistenceOptions);
    }

    const resolvePresentationPersistenceOptions = typeof options.resolvePresentationPersistenceOptions === 'function'
      ? options.resolvePresentationPersistenceOptions
      : null;
    const metadataPersistenceOptions = resolvePresentationPersistenceOptions
      ? resolvePresentationPersistenceOptions(activePresentationMetadata || {})
      : activePresentationMetadata
        && activePresentationMetadata.persistence
        && typeof activePresentationMetadata.persistence === 'object'
        && !Array.isArray(activePresentationMetadata.persistence)
        ? { ...activePresentationMetadata.persistence }
        : {};
    const mergePresentationPersistenceOptions = typeof options.mergePresentationPersistenceOptions === 'function'
      ? options.mergePresentationPersistenceOptions
      : (...optionSets) => optionSets.reduce((mergedOptions, optionSet) => ({
          ...mergedOptions,
          ...(optionSet && typeof optionSet === 'object' && !Array.isArray(optionSet)
            ? optionSet
            : {})
        }), {});
    return mergePresentationPersistenceOptions(
      metadataPersistenceOptions,
      explicitPersistenceOptions
    );
  }

  function createStudioMetadataPersistenceOptionsResolver(options = {}) {
    const getCurrentPresentationMetadata = typeof options.getCurrentPresentationMetadata === 'function'
      ? options.getCurrentPresentationMetadata
      : () => options.currentPresentationMetadata;
    const resolveMergedPresentationPersistenceOptions = typeof options.resolveMergedPresentationPersistenceOptions === 'function'
      ? options.resolveMergedPresentationPersistenceOptions
      : null;
    const resolvePresentationPersistenceOptions = typeof options.resolvePresentationPersistenceOptions === 'function'
      ? options.resolvePresentationPersistenceOptions
      : null;
    const mergePresentationPersistenceOptions = typeof options.mergePresentationPersistenceOptions === 'function'
      ? options.mergePresentationPersistenceOptions
      : null;
    const resolveMetadataPersistenceOptions = typeof options.resolveMetadataPersistenceOptions === 'function'
      ? options.resolveMetadataPersistenceOptions
      : resolveStudioMetadataPersistenceOptions;

    return function resolveMetadataOptions(nextOptions = {}) {
      return resolveMetadataPersistenceOptions({
        currentPresentationMetadata: Object.prototype.hasOwnProperty.call(nextOptions, 'currentPresentationMetadata')
          ? nextOptions.currentPresentationMetadata
          : getCurrentPresentationMetadata(),
        persistenceOptions: nextOptions.persistenceOptions,
        resolveMergedPresentationPersistenceOptions: typeof nextOptions.resolveMergedPresentationPersistenceOptions === 'function'
          ? nextOptions.resolveMergedPresentationPersistenceOptions
          : resolveMergedPresentationPersistenceOptions,
        resolvePresentationPersistenceOptions: typeof nextOptions.resolvePresentationPersistenceOptions === 'function'
          ? nextOptions.resolvePresentationPersistenceOptions
          : resolvePresentationPersistenceOptions,
        mergePresentationPersistenceOptions: typeof nextOptions.mergePresentationPersistenceOptions === 'function'
          ? nextOptions.mergePresentationPersistenceOptions
          : mergePresentationPersistenceOptions
      });
    };
  }

  function isStudioPersistedState(cleanHtml = '', canonicalDeck = null, options = {}) {
    if (!isStudioPersistedHtml(cleanHtml, options.persistedHtml)) {
      return false;
    }

    return isStudioPersistedCanonicalDeck(canonicalDeck, options.persistedCanonicalDeck, options);
  }

  function isStudioPersistedDeckHtml(cleanHtml = '', persistedDeckState = {}) {
    return isStudioPersistedHtml(
      cleanHtml,
      asPlainObject(persistedDeckState).cleanHtml
    );
  }

  function createStudioPersistedDeckHtmlChecker(options = {}) {
    const readPersistedDeckState = typeof options.readPersistedDeckState === 'function'
      ? options.readPersistedDeckState
      : () => options.persistedDeckState || {};
    const isPersistedDeckHtml = typeof options.isPersistedDeckHtml === 'function'
      ? options.isPersistedDeckHtml
      : isStudioPersistedDeckHtml;

    return function isPersistedDeckHtmlWithCurrentState(cleanHtml = '', nextOptions = {}) {
      const nextPersistedDeckState = typeof nextOptions.readPersistedDeckState === 'function'
        ? nextOptions.readPersistedDeckState()
        : readPersistedDeckState();
      const checkPersistedDeckHtml = typeof nextOptions.isPersistedDeckHtml === 'function'
        ? nextOptions.isPersistedDeckHtml
        : isPersistedDeckHtml;
      return checkPersistedDeckHtml(cleanHtml, nextPersistedDeckState);
    };
  }

  function isStudioPersistedSaveRequest(
    saveRequestBody = null,
    persistedDeckState = {},
    cleanHtml = saveRequestBody && saveRequestBody.htmlContent,
    options = {}
  ) {
    const nextPersistedDeckState = asPlainObject(persistedDeckState);
    return isStudioPersistedState(
      cleanHtml,
      saveRequestBody && saveRequestBody.canonicalDeck,
      {
        ...options,
        persistedHtml: nextPersistedDeckState.cleanHtml,
        persistedCanonicalDeck: nextPersistedDeckState.canonicalDeck
      }
    );
  }

  function createStudioPersistedSaveRequestChecker(options = {}) {
    const readPersistedDeckState = typeof options.readPersistedDeckState === 'function'
      ? options.readPersistedDeckState
      : () => options.persistedDeckState || {};
    const isPersistedSaveRequest = typeof options.isPersistedSaveRequest === 'function'
      ? options.isPersistedSaveRequest
      : isStudioPersistedSaveRequest;

    return function isPersistedSaveRequestWithCurrentState(
      saveRequestBody = null,
      cleanHtml = saveRequestBody && saveRequestBody.htmlContent,
      nextOptions = {}
    ) {
      const nextPersistedDeckState = typeof nextOptions.readPersistedDeckState === 'function'
        ? nextOptions.readPersistedDeckState()
        : readPersistedDeckState();
      const checkPersistedSaveRequest = typeof nextOptions.isPersistedSaveRequest === 'function'
        ? nextOptions.isPersistedSaveRequest
        : isPersistedSaveRequest;
      return checkPersistedSaveRequest(
        saveRequestBody,
        nextPersistedDeckState,
        cleanHtml,
        nextOptions
      );
    };
  }

  function isStudioPersistenceTaskStale(presentationUrl = '', options = {}) {
    const requestedPresentationUrl = normalizeString(presentationUrl);
    const currentPresentationUrl = normalizeString(
      typeof options.getCurrentPresentationUrl === 'function'
        ? options.getCurrentPresentationUrl()
        : options.currentPresentationUrl
    );
    if (!requestedPresentationUrl || requestedPresentationUrl !== currentPresentationUrl) {
      return true;
    }

    const requestedSessionToken = normalizeSessionToken(options.sessionToken);
    if (requestedSessionToken === null) {
      return false;
    }

    const currentSessionToken = normalizeSessionToken(
      typeof options.getCurrentSessionToken === 'function'
        ? options.getCurrentSessionToken()
        : options.currentSessionToken
    );
    return currentSessionToken !== requestedSessionToken;
  }

  function createStudioPersistenceTaskStaleChecker(options = {}) {
    const getPresentationUrl = typeof options.getPresentationUrl === 'function'
      ? options.getPresentationUrl
      : () => normalizeString(options.presentationUrl);
    const getSessionToken = typeof options.getSessionToken === 'function'
      ? options.getSessionToken
      : () => normalizeSessionToken(options.sessionToken);
    const defaultIsPersistenceTaskStale = typeof options.isPersistenceTaskStale === 'function'
      ? options.isPersistenceTaskStale
      : isStudioPersistenceTaskStale;

    return function isPersistenceTaskStale(
      presentationUrl = getPresentationUrl(),
      sessionToken = getSessionToken(),
      nextOptions = {}
    ) {
      const isPersistenceTaskStale = typeof nextOptions.isPersistenceTaskStale === 'function'
        ? nextOptions.isPersistenceTaskStale
        : defaultIsPersistenceTaskStale;

      return isPersistenceTaskStale(presentationUrl, {
        currentPresentationUrl: typeof nextOptions.getCurrentPresentationUrl === 'function'
          ? nextOptions.getCurrentPresentationUrl()
          : getPresentationUrl(),
        currentSessionToken: typeof nextOptions.getCurrentSessionToken === 'function'
          ? nextOptions.getCurrentSessionToken()
          : getSessionToken(),
        sessionToken
      });
    };
  }

  function clearStudioPersistenceTimers(options = {}) {
    const clearTimer = typeof options.clearTimer === 'function'
      ? options.clearTimer
      : (typeof clearTimeout === 'function' ? clearTimeout : () => {});
    const autoVersionTimers = options.autoVersionTimers && typeof options.autoVersionTimers === 'object'
      ? options.autoVersionTimers
      : {};

    if (typeof options.autoSaveDebounceTimer !== 'undefined' && options.autoSaveDebounceTimer !== null) {
      clearTimer(options.autoSaveDebounceTimer);
    }
    Object.values(autoVersionTimers).forEach((timerId) => {
      clearTimer(timerId);
    });

    return {
      autoSaveDebounceTimer: null,
      autoVersionTimers: {}
    };
  }

  function isStudioPersistenceActionCurrent(context = {}, options = {}) {
    const requestedPresentationUrl = normalizeString(context.presentationUrl);
    if (!requestedPresentationUrl) {
      return false;
    }

    const getCurrentPresentationUrl = typeof options.getCurrentPresentationUrl === 'function'
      ? options.getCurrentPresentationUrl
      : () => options.currentPresentationUrl;

    if (normalizeString(getCurrentPresentationUrl()) !== requestedPresentationUrl) {
      return false;
    }

    const requestedSessionToken = normalizeSessionToken(context.sessionToken);
    if (requestedSessionToken === null) {
      return true;
    }

    const getCurrentSessionToken = typeof options.getCurrentSessionToken === 'function'
      ? options.getCurrentSessionToken
      : () => options.currentSessionToken;

    return normalizeSessionToken(getCurrentSessionToken()) === requestedSessionToken;
  }

  function runStudioPersistenceActionIfCurrent(context = {}, options = {}, callback = null) {
    if (!isStudioPersistenceActionCurrent(context, options)) {
      return false;
    }

    if (typeof callback === 'function') {
      callback(context);
    }

    return true;
  }

  function createStudioPersistenceActionCurrentRunner(options = {}) {
    const readCurrentSessionState = typeof options.readCurrentSessionState === 'function'
      ? options.readCurrentSessionState
      : () => ({
        getCurrentPresentationUrl: typeof options.getCurrentPresentationUrl === 'function'
          ? options.getCurrentPresentationUrl
          : () => normalizeString(options.currentPresentationUrl),
        getCurrentSessionToken: typeof options.getCurrentSessionToken === 'function'
          ? options.getCurrentSessionToken
          : () => normalizeSessionToken(options.currentSessionToken)
      });
    const defaultRunPersistenceActionIfCurrent = typeof options.runPersistenceActionIfCurrent === 'function'
      ? options.runPersistenceActionIfCurrent
      : runStudioPersistenceActionIfCurrent;

    return function runPersistenceActionIfCurrent(context = {}, callback = null, nextOptions = {}) {
      const runPersistenceActionIfCurrent = typeof nextOptions.runPersistenceActionIfCurrent === 'function'
        ? nextOptions.runPersistenceActionIfCurrent
        : defaultRunPersistenceActionIfCurrent;
      const currentSessionState = typeof nextOptions.readCurrentSessionState === 'function'
        ? nextOptions.readCurrentSessionState()
        : readCurrentSessionState();

      return runPersistenceActionIfCurrent(context, currentSessionState, callback);
    };
  }

  function createStudioPersistenceFailureHandler(options = {}) {
    const createHandlerOptions = typeof options.createHandlerOptions === 'function'
      ? options.createHandlerOptions
      : (nextOptions = {}) => nextOptions;
    const defaultHandlePersistenceFailure = typeof options.handlePersistenceFailure === 'function'
      ? options.handlePersistenceFailure
      : handleStudioPersistenceFailure;

    return function handlePersistenceFailure(context = {}, nextOptions = {}) {
      const handlePersistenceFailure = typeof nextOptions.handlePersistenceFailure === 'function'
        ? nextOptions.handlePersistenceFailure
        : defaultHandlePersistenceFailure;
      const resolveHandlerOptions = typeof nextOptions.createHandlerOptions === 'function'
        ? nextOptions.createHandlerOptions
        : createHandlerOptions;

      return handlePersistenceFailure(context, resolveHandlerOptions(nextOptions));
    };
  }

  function createStudioPersistenceSuccessHandler(options = {}) {
    const createHandlerOptions = typeof options.createHandlerOptions === 'function'
      ? options.createHandlerOptions
      : (nextOptions = {}) => nextOptions;
    const defaultHandlePersistenceSuccess = typeof options.handlePersistenceSuccess === 'function'
      ? options.handlePersistenceSuccess
      : handleStudioPersistenceSuccess;

    return function handlePersistenceSuccess(context = {}, nextOptions = {}) {
      const handlePersistenceSuccess = typeof nextOptions.handlePersistenceSuccess === 'function'
        ? nextOptions.handlePersistenceSuccess
        : defaultHandlePersistenceSuccess;
      const resolveHandlerOptions = typeof nextOptions.createHandlerOptions === 'function'
        ? nextOptions.createHandlerOptions
        : createHandlerOptions;

      return handlePersistenceSuccess(context, resolveHandlerOptions(nextOptions));
    };
  }

  function createStudioVersionPersistenceSuccessHandler(options = {}) {
    const createHandlerOptions = typeof options.createHandlerOptions === 'function'
      ? options.createHandlerOptions
      : (nextOptions = {}) => nextOptions;
    const defaultHandleVersionPersistenceSuccess = typeof options.handleVersionPersistenceSuccess === 'function'
      ? options.handleVersionPersistenceSuccess
      : handleStudioVersionPersistenceSuccess;

    return function handleVersionPersistenceSuccess(context = {}, nextOptions = {}) {
      const handleVersionPersistenceSuccess = typeof nextOptions.handleVersionPersistenceSuccess === 'function'
        ? nextOptions.handleVersionPersistenceSuccess
        : defaultHandleVersionPersistenceSuccess;
      const resolveHandlerOptions = typeof nextOptions.createHandlerOptions === 'function'
        ? nextOptions.createHandlerOptions
        : createHandlerOptions;

      return handleVersionPersistenceSuccess(context, resolveHandlerOptions(nextOptions));
    };
  }

  function createStudioPersistenceHandlerOptionsBuilder(options = {}) {
    const getPresentationUrl = typeof options.getPresentationUrl === 'function'
      ? options.getPresentationUrl
      : () => normalizeString(options.presentationUrl);
    const defaultCreateSessionReaderOptions = typeof options.createSessionReaderOptions === 'function'
      ? options.createSessionReaderOptions
      : (nextOptions = {}) => nextOptions;
    const defaultApplyPersistedDeckState = typeof options.applyPersistedDeckState === 'function'
      ? options.applyPersistedDeckState
      : () => {};

    return function createPersistenceHandlerOptions(nextOptions = {}) {
      const createSessionReaderOptions = typeof nextOptions.createSessionReaderOptions === 'function'
        ? nextOptions.createSessionReaderOptions
        : defaultCreateSessionReaderOptions;
      const applyPersistedDeckState = typeof nextOptions.applyPersistedDeckState === 'function'
        ? nextOptions.applyPersistedDeckState
        : defaultApplyPersistedDeckState;
      const persistencePresentationUrl = typeof nextOptions.presentationUrl === 'string' && nextOptions.presentationUrl
        ? nextOptions.presentationUrl
        : getPresentationUrl();

      return createSessionReaderOptions({
        setPersistedHtml(nextHtml) {
          applyPersistedDeckState({ cleanHtml: nextHtml });
        },
        setPersistedCanonicalDeck(nextCanonicalDeck) {
          applyPersistedDeckState(
            { canonicalDeck: nextCanonicalDeck },
            { presentationUrl: persistencePresentationUrl }
          );
        },
        setPersistedPlaybackState(nextPlaybackState) {
          applyPersistedDeckState({ playbackState: nextPlaybackState });
        },
        onSuccess: nextOptions.onSuccess,
        onFailure: nextOptions.onFailure
      });
    };
  }

  function handleStudioPersistenceSuccess(context = {}, options = {}) {
    return runStudioPersistenceActionIfCurrent(context, options, (nextContext) => {
      if (nextContext.shouldUpdatePersistedHtml !== false && typeof options.setPersistedHtml === 'function') {
        options.setPersistedHtml(nextContext.cleanHtml);
      }
      if (nextContext.canonicalDeck && typeof options.setPersistedCanonicalDeck === 'function') {
        options.setPersistedCanonicalDeck(nextContext.canonicalDeck);
      }
      if (
        Object.prototype.hasOwnProperty.call(nextContext, 'playbackState')
        && nextContext.shouldUpdatePersistedPlaybackState !== false
        && typeof options.setPersistedPlaybackState === 'function'
      ) {
        options.setPersistedPlaybackState(nextContext.playbackState);
      }
      if (typeof options.onSuccess === 'function') {
        options.onSuccess(nextContext);
      }
    });
  }

  function handleStudioVersionPersistenceSuccess(context = {}, options = {}) {
    return handleStudioPersistenceSuccess(context, {
      ...options,
      onSuccess(nextContext) {
        if (typeof options.onSuccess === 'function') {
          options.onSuccess(nextContext);
        }
        if (typeof options.refreshVersionEntries === 'function') {
          options.refreshVersionEntries(
            nextContext.presentationUrl,
            normalizeSessionToken(nextContext.sessionToken)
          );
        }
      }
    });
  }

  function handleStudioPersistenceFailure(context = {}, options = {}) {
    return runStudioPersistenceActionIfCurrent(context, options, (nextContext) => {
      if (typeof options.onFailure === 'function') {
        options.onFailure(nextContext);
      }
    });
  }

  return {
    createStudioPersistableDeckState,
    createStudioPersistedDeckStateSnapshot,
    createStudioPersistedDeckStateReader,
    createStudioPersistedDeckStateUpdater,
    resolveStudioPersistedDeckStateSnapshotWithContent,
    applyStudioPersistedDeckState,
    createStudioPersistedDeckStateApplier,
    createStudioPersistedDeckStateContentResolver,
    createStudioPersistedActiveSlideIdReader,
    syncStudioPresentationMetadataPersistedCanonicalDeck,
    updateStudioPersistedDeckState,
    captureStudioPersistedDeckPlaybackState,
    createStudioPersistedDeckPlaybackStateCapturer,
    resolveStudioPersistableDeckStateWithContent,
    resolveStudioCapturedPersistableDeckState,
    createStudioCapturedPersistableDeckStateResolver,
    captureStudioPersistableDeckBuildState,
    createStudioPersistableDeckBuildStateCapturer,
    captureStudioPersistableDeckState,
    createStudioPersistableDeckStateCapturer,
    resolveStudioPersistenceCanonicalDeck,
    resolveStudioSaveRequestCanonicalDeck,
    resolveStudioCanonicalDeckOverride,
    resolveStudioFallbackCanonicalDeck,
    createStudioFallbackCanonicalDeckResolver,
    createStudioPersistenceActionContext,
    createStudioPersistedDeckStateActionContext,
    createStudioVersionPersistenceActionContext,
    resolveStudioSaveRequestDeckState,
    buildStudioPersistableDeckSanitizerOptions,
    createStudioPersistableDeckSanitizerOptionsBuilder,
    sanitizeStudioReusablePersistedHtml,
    buildStudioPersistableDeckHtmlWithoutDocument,
    buildStudioPersistableDeckHtmlFromDocument,
    buildStudioSaveRequestBody,
    createStudioSaveRequestBodyBuilder,
    buildStudioPersistenceRequestPlan,
    resolveStudioPersistenceStateFromDocumentCapture,
    createStudioPersistenceStateFromDocumentCaptureResolver,
    buildStudioAutoSavePersistencePlan,
    createStudioAutoSavePersistenceState,
    resolveStudioAutoSavePersistenceState,
    resolveStudioAutoSavePersistenceStateFromCapture,
    createStudioAutoSaveRequest,
    executeStudioAutoSavePersistenceRequest,
    executeStudioAutoSavePersistenceRequestWithHandlers,
    executeStudioPersistenceRequest,
    buildStudioVersionCheckpointPersistencePlan,
    createStudioVersionCheckpointRequest,
    executeStudioVersionCheckpointPersistenceRequest,
    executeStudioVersionCheckpointPersistenceRequestWithSuccess,
    executeStudioVersionCheckpointSave,
    executeStudioVersionCheckpointSaveWithSuccess,
    executeStudioVersionCheckpointSaveWithFailure,
    isStudioVersionCheckpointSavePersisted,
    createStudioVersionCheckpointRequestOptions,
    createStudioVersionCheckpointPersistenceState,
    resolveStudioVersionCheckpointPersistenceState,
    resolveStudioVersionCheckpointPersistenceStateFromCapture,
    isStudioPersistedHtml,
    isStudioPersistedCanonicalDeck,
    resolveStudioPersistedHtmlReuse,
    resolveStudioReusablePersistedHtml,
    createStudioReusablePersistedHtmlResolver,
    resolveStudioMetadataPersistenceOptions,
    createStudioMetadataPersistenceOptionsResolver,
    isStudioPersistedState,
    isStudioPersistedDeckHtml,
    createStudioPersistedDeckHtmlChecker,
    isStudioPersistedSaveRequest,
    createStudioPersistedSaveRequestChecker,
    isStudioPersistenceTaskStale,
    createStudioPersistenceTaskStaleChecker,
    clearStudioPersistenceTimers,
    isStudioPersistenceActionCurrent,
    runStudioPersistenceActionIfCurrent,
    createStudioPersistenceActionCurrentRunner,
    createStudioPersistenceFailureHandler,
    createStudioPersistenceSuccessHandler,
    createStudioVersionPersistenceSuccessHandler,
    createStudioPersistenceHandlerOptionsBuilder,
    handleStudioPersistenceSuccess,
    handleStudioVersionPersistenceSuccess,
    handleStudioPersistenceFailure
  };
});
