(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorPersistenceState = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function createStudioEditorPersistedDeckStateAdapter(options = {}) {
    const persistenceApi = options.persistenceApi && typeof options.persistenceApi === 'object'
      ? options.persistenceApi
      : null;
    const resolveCanonicalDeck = typeof options.resolveCanonicalDeck === 'function'
      ? options.resolveCanonicalDeck
      : () => null;
    const normalizePlaybackState = typeof options.normalizePlaybackState === 'function'
      ? options.normalizePlaybackState
      : (playbackState) => playbackState || null;
    const setPersistedDeckHtml = typeof options.setPersistedDeckHtml === 'function'
      ? options.setPersistedDeckHtml
      : () => {};
    const setPersistedCanonicalDeck = typeof options.setPersistedCanonicalDeck === 'function'
      ? options.setPersistedCanonicalDeck
      : () => {};
    const setPersistedPlaybackState = typeof options.setPersistedPlaybackState === 'function'
      ? options.setPersistedPlaybackState
      : () => {};

    let stateUpdater = null;

    function createStateUpdater() {
      if (!persistenceApi || typeof persistenceApi.createStudioPersistedDeckStateUpdater !== 'function') {
        return null;
      }
      return persistenceApi.createStudioPersistedDeckStateUpdater({
        resolveCanonicalDeck,
        normalizePlaybackState,
        setPersistedDeckHtml,
        setPersistedCanonicalDeck,
        setPersistedPlaybackState
      });
    }

    return function updateEditorPersistedDeckState(nextState = {}) {
      if (!stateUpdater) {
        stateUpdater = createStateUpdater();
      }
      if (typeof stateUpdater !== 'function') return {};
      return stateUpdater(nextState);
    };
  }

  function createStudioEditorPersistedDeckStateApplierAdapter(options = {}) {
    const persistenceApi = options.persistenceApi && typeof options.persistenceApi === 'object'
      ? options.persistenceApi
      : null;
    const currentPresentationUrl = typeof options.currentPresentationUrl === 'string'
      ? options.currentPresentationUrl
      : '';
    const updatePersistedDeckState = typeof options.updatePersistedDeckState === 'function'
      ? options.updatePersistedDeckState
      : () => {};
    const setCurrentPresentationCanonicalDeck = typeof options.setCurrentPresentationCanonicalDeck === 'function'
      ? options.setCurrentPresentationCanonicalDeck
      : () => {};

    let stateApplier = null;

    function createStateApplier() {
      if (!persistenceApi || typeof persistenceApi.createStudioPersistedDeckStateApplier !== 'function') {
        return null;
      }
      return persistenceApi.createStudioPersistedDeckStateApplier({
        currentPresentationUrl,
        updatePersistedDeckState,
        setCurrentPresentationCanonicalDeck
      });
    }

    return function applyEditorPersistedDeckState(nextState = {}, nextOptions = {}) {
      if (!stateApplier) {
        stateApplier = createStateApplier();
      }
      if (typeof stateApplier !== 'function') return nextState;
      return stateApplier(nextState, nextOptions);
    };
  }

  function createStudioEditorPersistedDeckStateReaderAdapter(options = {}) {
    const persistenceApi = options.persistenceApi && typeof options.persistenceApi === 'object'
      ? options.persistenceApi
      : null;
    const getPersistedDeckHtml = typeof options.getPersistedDeckHtml === 'function'
      ? options.getPersistedDeckHtml
      : () => options.persistedDeckHtml;
    const getPersistedCanonicalDeck = typeof options.getPersistedCanonicalDeck === 'function'
      ? options.getPersistedCanonicalDeck
      : () => options.persistedCanonicalDeck;
    const getPersistedPlaybackState = typeof options.getPersistedPlaybackState === 'function'
      ? options.getPersistedPlaybackState
      : () => options.persistedPlaybackState;
    const resolvePersistedDeckStateSnapshotWithContent = typeof options.resolvePersistedDeckStateSnapshotWithContent === 'function'
      ? options.resolvePersistedDeckStateSnapshotWithContent
      : persistenceApi
        && typeof persistenceApi.resolveStudioPersistedDeckStateSnapshotWithContent === 'function'
        ? persistenceApi.resolveStudioPersistedDeckStateSnapshotWithContent
        : null;
    const resolvePersistableDeckStateWithContent = typeof options.resolvePersistableDeckStateWithContent === 'function'
      ? options.resolvePersistableDeckStateWithContent
      : persistenceApi
        && typeof persistenceApi.resolveStudioPersistableDeckStateWithContent === 'function'
        ? persistenceApi.resolveStudioPersistableDeckStateWithContent
        : null;

    let stateReader = null;
    let contentReader = null;
    let contentResolver = null;

    function createStateReader(readerOptions = {}) {
      if (!persistenceApi || typeof persistenceApi.createStudioPersistedDeckStateReader !== 'function') {
        return null;
      }
      return persistenceApi.createStudioPersistedDeckStateReader({
        getPersistedDeckHtml,
        getPersistedCanonicalDeck,
        getPersistedPlaybackState,
        ...readerOptions
      });
    }

    function readPersistedDeckState() {
      if (typeof stateReader !== 'function') {
        stateReader = createStateReader();
      }
      if (typeof stateReader === 'function') {
        return stateReader();
      }
      return {
        cleanHtml: '',
        canonicalDeck: null,
        playbackState: null
      };
    }

    readPersistedDeckState.resolveWithContent = function (persistedDeckState = readPersistedDeckState()) {
      if (typeof contentReader !== 'function') {
        contentReader = createStateReader({
          resolvePersistedDeckStateSnapshotWithContent,
          resolvePersistableDeckStateWithContent
        });
      }
      if (contentReader && typeof contentReader.resolveWithContent === 'function') {
        return contentReader.resolveWithContent(persistedDeckState);
      }
      return null;
    };

    readPersistedDeckState.resolvePersistedDeckStateWithContent = function (persistedDeckState = readPersistedDeckState()) {
      if (typeof contentResolver !== 'function') {
        if (!persistenceApi || typeof persistenceApi.createStudioPersistedDeckStateContentResolver !== 'function') {
          return null;
        }
        contentResolver = persistenceApi.createStudioPersistedDeckStateContentResolver({
          readPersistedDeckState,
          resolveWithContent: readPersistedDeckState.resolveWithContent
        });
      }
      if (typeof contentResolver !== 'function') return null;
      return contentResolver(persistedDeckState);
    };

    readPersistedDeckState.isStudioEditorPersistedDeckStateReaderAdapter = true;

    return readPersistedDeckState;
  }

  function createStudioEditorPersistedActiveSlideIdAdapter(options = {}) {
    const persistenceApi = options.persistenceApi && typeof options.persistenceApi === 'object'
      ? options.persistenceApi
      : null;
    const getPlaybackState = typeof options.getPlaybackState === 'function'
      ? options.getPlaybackState
      : () => options.playbackState;
    const resolvePersistedDeckActiveSlideId = typeof options.resolvePersistedDeckActiveSlideId === 'function'
      ? options.resolvePersistedDeckActiveSlideId
      : persistenceApi
        && typeof persistenceApi.resolvePersistedDeckActiveSlideId === 'function'
        ? persistenceApi.resolvePersistedDeckActiveSlideId
        : null;
    let activeSlideIdReader = null;

    function createActiveSlideIdReader() {
      if (!persistenceApi || typeof persistenceApi.createStudioPersistedActiveSlideIdReader !== 'function') {
        return null;
      }
      return persistenceApi.createStudioPersistedActiveSlideIdReader({
        getPlaybackState,
        resolvePersistedDeckActiveSlideId
      });
    }

    const getPersistedActiveSlideId = function (playbackState = getPlaybackState()) {
      if (typeof activeSlideIdReader !== 'function') {
        activeSlideIdReader = createActiveSlideIdReader();
      }
      if (typeof activeSlideIdReader !== 'function') return '';
      return activeSlideIdReader(playbackState);
    };

    getPersistedActiveSlideId.isStudioEditorPersistedActiveSlideIdAdapter = true;

    return getPersistedActiveSlideId;
  }

  function createStudioEditorFallbackCanonicalDeckAdapter(options = {}) {
    const persistenceApi = options.persistenceApi && typeof options.persistenceApi === 'object'
      ? options.persistenceApi
      : null;
    const buildCanonicalDeck = typeof options.buildCanonicalDeck === 'function'
      ? options.buildCanonicalDeck
      : null;
    const resolveCanonicalDeckOverride = typeof options.resolveCanonicalDeckOverride === 'function'
      ? options.resolveCanonicalDeckOverride
      : null;
    const isCanonicalDeck = typeof options.isCanonicalDeck === 'function'
      ? options.isCanonicalDeck
      : null;

    return function resolveFallbackCanonicalDeck(canonicalDeck = null) {
      if (!persistenceApi || typeof persistenceApi.createStudioFallbackCanonicalDeckResolver !== 'function') {
        return null;
      }
      const resolver = persistenceApi.createStudioFallbackCanonicalDeckResolver({
        buildCanonicalDeck: canonicalDeck && buildCanonicalDeck
          ? () => buildCanonicalDeck()
          : null,
        resolveCanonicalDeckOverride,
        isCanonicalDeck
      });
      return typeof resolver === 'function' ? resolver(canonicalDeck) : null;
    };
  }

  function createStudioEditorCanonicalDeckOverrideAdapter(options = {}) {
    const persistenceApi = options.persistenceApi && typeof options.persistenceApi === 'object'
      ? options.persistenceApi
      : null;
    const resolveCanonicalDeckOverride = typeof options.resolveCanonicalDeckOverride === 'function'
      ? options.resolveCanonicalDeckOverride
      : persistenceApi
        && typeof persistenceApi.resolveStudioCanonicalDeckOverride === 'function'
        ? persistenceApi.resolveStudioCanonicalDeckOverride
        : null;
    const isCanonicalDeck = typeof options.isCanonicalDeck === 'function'
      ? options.isCanonicalDeck
      : null;

    return function resolveEditorCanonicalDeckOverride(canonicalDeck = null, nextOptions = {}) {
      if (!resolveCanonicalDeckOverride) return null;
      return resolveCanonicalDeckOverride({
        canonicalDeck,
        buildCanonicalDeck: typeof nextOptions.buildCanonicalDeck === 'function'
          ? nextOptions.buildCanonicalDeck
          : null,
        isCanonicalDeck
      });
    };
  }

  function createStudioEditorReusablePersistedHtmlAdapter(options = {}) {
    const persistenceApi = options.persistenceApi && typeof options.persistenceApi === 'object'
      ? options.persistenceApi
      : null;
    const defaultResolveReusablePersistedHtml = persistenceApi
      && typeof persistenceApi.resolveStudioReusablePersistedHtml === 'function'
      ? persistenceApi.resolveStudioReusablePersistedHtml
      : null;
    const defaultResolvePersistedHtmlReuse = persistenceApi
      && typeof persistenceApi.resolveStudioPersistedHtmlReuse === 'function'
      ? persistenceApi.resolveStudioPersistedHtmlReuse
      : null;
    const defaultIsPersistedCanonicalDeck = persistenceApi
      && typeof persistenceApi.isStudioPersistedCanonicalDeck === 'function'
      ? persistenceApi.isStudioPersistedCanonicalDeck
      : null;

    function buildResolverOptions(nextOptions = {}) {
      return {
        persistedHtml: typeof nextOptions.persistedHtml === 'string'
          ? nextOptions.persistedHtml
          : undefined,
        canonicalDeck: Object.prototype.hasOwnProperty.call(nextOptions, 'canonicalDeck')
          ? nextOptions.canonicalDeck
          : null,
        persistedCanonicalDeck: Object.prototype.hasOwnProperty.call(nextOptions, 'persistedCanonicalDeck')
          ? nextOptions.persistedCanonicalDeck
          : undefined,
        resolvePersistedHtmlReuse: typeof nextOptions.resolveStudioPersistedHtmlReuse === 'function'
          ? nextOptions.resolveStudioPersistedHtmlReuse
          : undefined,
        isPersistedCanonicalDeck: typeof nextOptions.isPersistedCanonicalDeck === 'function'
          ? nextOptions.isPersistedCanonicalDeck
          : undefined
      };
    }

    return function resolveEditorReusablePersistedHtml(persistedDeckState, nextOptions = {}) {
      const resolveReusablePersistedHtml = typeof nextOptions.resolveStudioReusablePersistedHtml === 'function'
        ? nextOptions.resolveStudioReusablePersistedHtml
        : defaultResolveReusablePersistedHtml;
      const resolvePersistedHtmlReuse = typeof nextOptions.resolveStudioPersistedHtmlReuse === 'function'
        ? nextOptions.resolveStudioPersistedHtmlReuse
        : defaultResolvePersistedHtmlReuse;
      const isPersistedCanonicalDeck = typeof nextOptions.isPersistedCanonicalDeck === 'function'
        ? nextOptions.isPersistedCanonicalDeck
        : defaultIsPersistedCanonicalDeck;
      const resolverOptions = buildResolverOptions(nextOptions);
      const createStudioReusablePersistedHtmlResolver = persistenceApi
        && typeof persistenceApi.createStudioReusablePersistedHtmlResolver === 'function'
        ? persistenceApi.createStudioReusablePersistedHtmlResolver
        : null;
      if (createStudioReusablePersistedHtmlResolver) {
        return createStudioReusablePersistedHtmlResolver({
          resolveReusablePersistedHtml,
          resolvePersistedHtmlReuse,
          isPersistedCanonicalDeck
        })(persistedDeckState, resolverOptions);
      }
      if (!resolveReusablePersistedHtml) return '';
      return resolveReusablePersistedHtml(persistedDeckState, {
        ...resolverOptions,
        resolvePersistedHtmlReuse,
        isPersistedCanonicalDeck
      });
    };
  }

  function createStudioEditorMetadataPersistenceOptionsAdapter(options = {}) {
    const persistenceApi = options.persistenceApi && typeof options.persistenceApi === 'object'
      ? options.persistenceApi
      : null;
    const getCurrentPresentationMetadata = typeof options.getCurrentPresentationMetadata === 'function'
      ? options.getCurrentPresentationMetadata
      : () => options.currentPresentationMetadata;
    const defaultResolveMergedPresentationPersistenceOptions = typeof options.resolveMergedPresentationPersistenceOptions === 'function'
      ? options.resolveMergedPresentationPersistenceOptions
      : null;
    const defaultResolvePresentationPersistenceOptions = typeof options.resolvePresentationPersistenceOptions === 'function'
      ? options.resolvePresentationPersistenceOptions
      : null;
    const defaultMergePresentationPersistenceOptions = typeof options.mergePresentationPersistenceOptions === 'function'
      ? options.mergePresentationPersistenceOptions
      : null;
    const defaultResolveMetadataPersistenceOptions = typeof options.resolveMetadataPersistenceOptions === 'function'
      ? options.resolveMetadataPersistenceOptions
      : persistenceApi
        && typeof persistenceApi.resolveStudioMetadataPersistenceOptions === 'function'
        ? persistenceApi.resolveStudioMetadataPersistenceOptions
        : null;

    return function resolveEditorMetadataPersistenceOptions(nextOptions = {}) {
      const resolveMergedPresentationPersistenceOptions = typeof nextOptions.resolveMergedPresentationPersistenceOptions === 'function'
        ? nextOptions.resolveMergedPresentationPersistenceOptions
        : defaultResolveMergedPresentationPersistenceOptions;
      const resolvePresentationPersistenceOptions = typeof nextOptions.resolvePresentationPersistenceOptions === 'function'
        ? nextOptions.resolvePresentationPersistenceOptions
        : defaultResolvePresentationPersistenceOptions;
      const mergePresentationPersistenceOptions = typeof nextOptions.mergePresentationPersistenceOptions === 'function'
        ? nextOptions.mergePresentationPersistenceOptions
        : defaultMergePresentationPersistenceOptions;
      const resolveMetadataPersistenceOptions = typeof nextOptions.resolveStudioMetadataPersistenceOptions === 'function'
        ? nextOptions.resolveStudioMetadataPersistenceOptions
        : defaultResolveMetadataPersistenceOptions;
      const createStudioMetadataPersistenceOptionsResolver = persistenceApi
        && typeof persistenceApi.createStudioMetadataPersistenceOptionsResolver === 'function'
        ? persistenceApi.createStudioMetadataPersistenceOptionsResolver
        : null;
      if (createStudioMetadataPersistenceOptionsResolver) {
        return createStudioMetadataPersistenceOptionsResolver({
          getCurrentPresentationMetadata,
          resolveMergedPresentationPersistenceOptions,
          resolvePresentationPersistenceOptions,
          mergePresentationPersistenceOptions,
          resolveMetadataPersistenceOptions
        })(nextOptions);
      }
      if (resolveMetadataPersistenceOptions) {
        return resolveMetadataPersistenceOptions({
          currentPresentationMetadata: Object.prototype.hasOwnProperty.call(nextOptions, 'currentPresentationMetadata')
            ? nextOptions.currentPresentationMetadata
            : getCurrentPresentationMetadata(),
          persistenceOptions: nextOptions.persistenceOptions,
          resolveMergedPresentationPersistenceOptions,
          resolvePresentationPersistenceOptions,
          mergePresentationPersistenceOptions
        });
      }
      return {};
    };
  }

  function createStudioEditorPersistableDeckSanitizerOptionsAdapter(options = {}) {
    const persistenceApi = options.persistenceApi && typeof options.persistenceApi === 'object'
      ? options.persistenceApi
      : null;
    const defaultResolveMetadataPersistenceOptions = typeof options.resolveMetadataPersistenceOptions === 'function'
      ? options.resolveMetadataPersistenceOptions
      : () => ({});
    const defaultGetDeckSanitizerOptions = typeof options.getDeckSanitizerOptions === 'function'
      ? options.getDeckSanitizerOptions
      : () => ({});

    return function buildEditorPersistableDeckSanitizerOptions(playbackState = null, nextOptions = {}) {
      const resolveMetadataPersistenceOptions = typeof nextOptions.resolveMetadataPersistenceOptions === 'function'
        ? nextOptions.resolveMetadataPersistenceOptions
        : defaultResolveMetadataPersistenceOptions;
      const getDeckSanitizerOptions = typeof nextOptions.getDeckSanitizerOptions === 'function'
        ? nextOptions.getDeckSanitizerOptions
        : defaultGetDeckSanitizerOptions;
      const createStudioPersistableDeckSanitizerOptionsBuilder = persistenceApi
        && typeof persistenceApi.createStudioPersistableDeckSanitizerOptionsBuilder === 'function'
        ? persistenceApi.createStudioPersistableDeckSanitizerOptionsBuilder
        : null;
      if (createStudioPersistableDeckSanitizerOptionsBuilder) {
        const buildSanitizerOptions = createStudioPersistableDeckSanitizerOptionsBuilder({
          resolveMetadataPersistenceOptions,
          getDeckSanitizerOptions
        });
        return typeof buildSanitizerOptions === 'function'
          ? buildSanitizerOptions(playbackState, nextOptions)
          : {};
      }

      const buildStudioPersistableDeckSanitizerOptions = persistenceApi
        && typeof persistenceApi.buildStudioPersistableDeckSanitizerOptions === 'function'
        ? persistenceApi.buildStudioPersistableDeckSanitizerOptions
        : null;
      if (!buildStudioPersistableDeckSanitizerOptions) return {};
      return buildStudioPersistableDeckSanitizerOptions(playbackState, {
        resolveMetadataPersistenceOptions,
        getDeckSanitizerOptions
      });
    };
  }

  function createStudioEditorReusablePersistedHtmlSanitizerAdapter(options = {}) {
    const persistenceApi = options.persistenceApi && typeof options.persistenceApi === 'object'
      ? options.persistenceApi
      : null;
    const defaultBuildPersistableDeckHtml = typeof options.buildPersistableDeckHtml === 'function'
      ? options.buildPersistableDeckHtml
      : null;
    const defaultResolveMetadataPersistenceOptions = typeof options.resolveMetadataPersistenceOptions === 'function'
      ? options.resolveMetadataPersistenceOptions
      : () => ({});
    const defaultGetDeckSanitizerOptions = typeof options.getDeckSanitizerOptions === 'function'
      ? options.getDeckSanitizerOptions
      : () => ({});
    const defaultDOMParser = typeof options.DOMParser === 'function'
      ? options.DOMParser
      : null;

    return function sanitizeEditorReusablePersistedHtml(persistedHtml, nextOptions = {}) {
      const nextPersistedHtml = typeof persistedHtml === 'string'
        ? persistedHtml
        : '';
      const sanitizeStudioReusablePersistedHtml = persistenceApi
        && typeof persistenceApi.sanitizeStudioReusablePersistedHtml === 'function'
        ? persistenceApi.sanitizeStudioReusablePersistedHtml
        : null;
      if (!sanitizeStudioReusablePersistedHtml) return nextPersistedHtml;
      return sanitizeStudioReusablePersistedHtml(nextPersistedHtml, {
        playbackState: Object.prototype.hasOwnProperty.call(nextOptions, 'playbackState')
          ? nextOptions.playbackState
          : null,
        resolveMetadataPersistenceOptions: typeof nextOptions.resolveMetadataPersistenceOptions === 'function'
          ? nextOptions.resolveMetadataPersistenceOptions
          : defaultResolveMetadataPersistenceOptions,
        getDeckSanitizerOptions: typeof nextOptions.getDeckSanitizerOptions === 'function'
          ? nextOptions.getDeckSanitizerOptions
          : defaultGetDeckSanitizerOptions,
        buildPersistableDeckHtml: typeof nextOptions.buildPersistableDeckHtml === 'function'
          ? nextOptions.buildPersistableDeckHtml
          : defaultBuildPersistableDeckHtml,
        DOMParser: typeof nextOptions.DOMParser === 'function'
          ? nextOptions.DOMParser
          : defaultDOMParser,
        parseHtml: typeof nextOptions.parseHtml === 'function'
          ? nextOptions.parseHtml
          : undefined,
        buildPersistableDeckSanitizerOptions: typeof nextOptions.buildPersistableDeckSanitizerOptions === 'function'
          ? nextOptions.buildPersistableDeckSanitizerOptions
          : undefined
      });
    };
  }

  function createStudioEditorCapturedPersistableDeckStateResolverAdapter(options = {}) {
    const persistenceApi = options.persistenceApi && typeof options.persistenceApi === 'object'
      ? options.persistenceApi
      : null;
    const defaultBuildCanonicalDeck = typeof options.buildCanonicalDeck === 'function'
      ? options.buildCanonicalDeck
      : () => null;
    const defaultResolvePlaybackState = typeof options.resolvePlaybackState === 'function'
      ? options.resolvePlaybackState
      : () => null;
    const defaultResolveCapturedPersistableDeckState = typeof options.resolveCapturedPersistableDeckState === 'function'
      ? options.resolveCapturedPersistableDeckState
      : persistenceApi
        && typeof persistenceApi.resolveStudioCapturedPersistableDeckState === 'function'
        ? persistenceApi.resolveStudioCapturedPersistableDeckState
        : null;

    return function resolveEditorCapturedPersistableDeckState(cleanHtml = '', nextOptions = {}) {
      const resolvedOptions = nextOptions && typeof nextOptions === 'object'
        ? nextOptions
        : {};
      const buildCanonicalDeck = typeof resolvedOptions.buildCanonicalDeck === 'function'
        ? resolvedOptions.buildCanonicalDeck
        : defaultBuildCanonicalDeck;
      const resolvePlaybackState = typeof resolvedOptions.resolvePlaybackState === 'function'
        ? resolvedOptions.resolvePlaybackState
        : defaultResolvePlaybackState;
      const resolveCapturedPersistableDeckState = typeof resolvedOptions.resolveStudioCapturedPersistableDeckState === 'function'
        ? resolvedOptions.resolveStudioCapturedPersistableDeckState
        : defaultResolveCapturedPersistableDeckState;
      const createStudioCapturedPersistableDeckStateResolver = persistenceApi
        && typeof persistenceApi.createStudioCapturedPersistableDeckStateResolver === 'function'
        ? persistenceApi.createStudioCapturedPersistableDeckStateResolver
        : null;
      if (createStudioCapturedPersistableDeckStateResolver) {
        const resolver = createStudioCapturedPersistableDeckStateResolver({
          buildCanonicalDeck,
          resolvePlaybackState,
          resolveCapturedPersistableDeckState
        });
        return typeof resolver === 'function'
          ? resolver(cleanHtml, resolvedOptions)
          : null;
      }
      if (!resolveCapturedPersistableDeckState) return null;
      return resolveCapturedPersistableDeckState(
        typeof cleanHtml === 'string' ? cleanHtml : '',
        {
          canonicalDeck: Object.prototype.hasOwnProperty.call(resolvedOptions, 'canonicalDeck')
            ? resolvedOptions.canonicalDeck
            : null,
          playbackState: Object.prototype.hasOwnProperty.call(resolvedOptions, 'playbackState')
            ? resolvedOptions.playbackState
            : undefined,
          buildCanonicalDeck,
          resolvePlaybackState
        }
      );
    };
  }

  function createStudioEditorPersistableDeckBuildStateCapturerAdapter(options = {}) {
    const persistenceApi = options.persistenceApi && typeof options.persistenceApi === 'object'
      ? options.persistenceApi
      : null;
    const defaultBuildPersistableDeckHtml = typeof options.buildPersistableDeckHtml === 'function'
      ? options.buildPersistableDeckHtml
      : () => '';
    const defaultCapturePersistableDeckBuildState = typeof options.capturePersistableDeckBuildState === 'function'
      ? options.capturePersistableDeckBuildState
      : persistenceApi
        && typeof persistenceApi.captureStudioPersistableDeckBuildState === 'function'
        ? persistenceApi.captureStudioPersistableDeckBuildState
        : null;

    return function captureEditorPersistableDeckBuildState(doc = null, nextOptions = {}) {
      const resolvedOptions = nextOptions && typeof nextOptions === 'object'
        ? nextOptions
        : {};
      const buildPersistableDeckHtml = typeof resolvedOptions.buildPersistableDeckHtml === 'function'
        ? resolvedOptions.buildPersistableDeckHtml
        : defaultBuildPersistableDeckHtml;
      const capturePersistableDeckBuildState = typeof resolvedOptions.captureStudioPersistableDeckBuildState === 'function'
        ? resolvedOptions.captureStudioPersistableDeckBuildState
        : defaultCapturePersistableDeckBuildState;
      const createStudioPersistableDeckBuildStateCapturer = persistenceApi
        && typeof persistenceApi.createStudioPersistableDeckBuildStateCapturer === 'function'
        ? persistenceApi.createStudioPersistableDeckBuildStateCapturer
        : null;
      if (createStudioPersistableDeckBuildStateCapturer) {
        const capturer = createStudioPersistableDeckBuildStateCapturer({
          capturePersistableDeckBuildState,
          buildPersistableDeckHtml
        });
        return typeof capturer === 'function'
          ? capturer(doc, resolvedOptions)
          : null;
      }
      if (!capturePersistableDeckBuildState) return null;
      return capturePersistableDeckBuildState(doc, {
        ...resolvedOptions,
        buildPersistableDeckHtml
      });
    };
  }

  function createStudioEditorPersistableDeckStateCapturerAdapter(options = {}) {
    const persistenceApi = options.persistenceApi && typeof options.persistenceApi === 'object'
      ? options.persistenceApi
      : null;
    const defaultCapturePersistableDeckState = typeof options.capturePersistableDeckState === 'function'
      ? options.capturePersistableDeckState
      : persistenceApi
        && typeof persistenceApi.captureStudioPersistableDeckState === 'function'
        ? persistenceApi.captureStudioPersistableDeckState
        : null;
    const defaultCaptureBuildState = typeof options.captureBuildState === 'function'
      ? options.captureBuildState
      : null;
    const defaultBuildCanonicalDeck = typeof options.buildCanonicalDeck === 'function'
      ? options.buildCanonicalDeck
      : () => null;
    const defaultResolvePlaybackState = typeof options.resolvePlaybackState === 'function'
      ? options.resolvePlaybackState
      : () => null;

    return function captureEditorPersistableDeckState(doc = null, nextOptions = {}) {
      const resolvedOptions = nextOptions && typeof nextOptions === 'object'
        ? nextOptions
        : {};
      const capturePersistableDeckState = typeof resolvedOptions.captureStudioPersistableDeckState === 'function'
        ? resolvedOptions.captureStudioPersistableDeckState
        : defaultCapturePersistableDeckState;
      const captureBuildState = typeof resolvedOptions.captureBuildState === 'function'
        ? resolvedOptions.captureBuildState
        : defaultCaptureBuildState;
      const buildCanonicalDeck = typeof resolvedOptions.buildCanonicalDeck === 'function'
        ? resolvedOptions.buildCanonicalDeck
        : defaultBuildCanonicalDeck;
      const resolvePlaybackState = typeof resolvedOptions.resolvePlaybackState === 'function'
        ? resolvedOptions.resolvePlaybackState
        : defaultResolvePlaybackState;
      const createStudioPersistableDeckStateCapturer = persistenceApi
        && typeof persistenceApi.createStudioPersistableDeckStateCapturer === 'function'
        ? persistenceApi.createStudioPersistableDeckStateCapturer
        : null;
      if (createStudioPersistableDeckStateCapturer) {
        const capturer = createStudioPersistableDeckStateCapturer({
          capturePersistableDeckState,
          captureBuildState,
          buildCanonicalDeck,
          resolvePlaybackState
        });
        return typeof capturer === 'function'
          ? capturer(doc, {
              canonicalDeck: Object.prototype.hasOwnProperty.call(resolvedOptions, 'canonicalDeck')
                ? resolvedOptions.canonicalDeck
                : null
            })
          : null;
      }
      if (!capturePersistableDeckState) return null;
      return capturePersistableDeckState(doc, {
        canonicalDeck: Object.prototype.hasOwnProperty.call(resolvedOptions, 'canonicalDeck')
          ? resolvedOptions.canonicalDeck
          : null,
        captureBuildState,
        buildCanonicalDeck,
        resolvePlaybackState
      });
    };
  }

  function createStudioEditorPersistedDeckPlaybackStateCapturerAdapter(options = {}) {
    const persistenceApi = options.persistenceApi && typeof options.persistenceApi === 'object'
      ? options.persistenceApi
      : null;
    const deckPersistenceApi = options.deckPersistenceApi && typeof options.deckPersistenceApi === 'object'
      ? options.deckPersistenceApi
      : null;
    const capturePlaybackState = typeof options.capturePlaybackState === 'function'
      ? options.capturePlaybackState
      : persistenceApi
        && typeof persistenceApi.captureStudioPersistedDeckPlaybackState === 'function'
        ? persistenceApi.captureStudioPersistedDeckPlaybackState
        : null;
    const capturePersistedDeckPlaybackStateWithFallback = typeof options.capturePersistedDeckPlaybackStateWithFallback === 'function'
      ? options.capturePersistedDeckPlaybackStateWithFallback
      : deckPersistenceApi
        && typeof deckPersistenceApi.capturePersistedDeckPlaybackStateWithFallback === 'function'
        ? deckPersistenceApi.capturePersistedDeckPlaybackStateWithFallback
        : null;
    const capturePersistedDeckPlaybackState = typeof options.capturePersistedDeckPlaybackState === 'function'
      ? options.capturePersistedDeckPlaybackState
      : deckPersistenceApi
        && typeof deckPersistenceApi.capturePersistedDeckPlaybackState === 'function'
        ? deckPersistenceApi.capturePersistedDeckPlaybackState
        : null;
    const ensurePersistedDeckPlaybackStateActiveSlideId = typeof options.ensurePersistedDeckPlaybackStateActiveSlideId === 'function'
      ? options.ensurePersistedDeckPlaybackStateActiveSlideId
      : deckPersistenceApi
        && typeof deckPersistenceApi.ensurePersistedDeckPlaybackStateActiveSlideId === 'function'
        ? deckPersistenceApi.ensurePersistedDeckPlaybackStateActiveSlideId
        : null;
    const getSlides = typeof options.getSlides === 'function'
      ? options.getSlides
      : null;
    const slideIdAttr = typeof options.slideIdAttr === 'string'
      ? options.slideIdAttr
      : '';
    const resolveFallbackActiveSlideId = typeof options.resolveFallbackActiveSlideId === 'function'
      ? options.resolveFallbackActiveSlideId
      : null;

    return function captureEditorPersistedDeckPlaybackState(doc = null, nextOptions = {}) {
      const resolvedOptions = nextOptions && typeof nextOptions === 'object'
        ? nextOptions
        : {};
      const canonicalDeck = Object.prototype.hasOwnProperty.call(resolvedOptions, 'canonicalDeck')
        ? resolvedOptions.canonicalDeck
        : null;
      const createStudioPersistedDeckPlaybackStateCapturer = persistenceApi
        && typeof persistenceApi.createStudioPersistedDeckPlaybackStateCapturer === 'function'
        ? persistenceApi.createStudioPersistedDeckPlaybackStateCapturer
        : null;
      const captureOptions = {
        capturePlaybackState: typeof resolvedOptions.capturePlaybackState === 'function'
          ? resolvedOptions.capturePlaybackState
          : capturePlaybackState,
        capturePersistedDeckPlaybackStateWithFallback: typeof resolvedOptions.capturePersistedDeckPlaybackStateWithFallback === 'function'
          ? resolvedOptions.capturePersistedDeckPlaybackStateWithFallback
          : capturePersistedDeckPlaybackStateWithFallback,
        capturePersistedDeckPlaybackState: typeof resolvedOptions.capturePersistedDeckPlaybackState === 'function'
          ? resolvedOptions.capturePersistedDeckPlaybackState
          : capturePersistedDeckPlaybackState,
        ensurePersistedDeckPlaybackStateActiveSlideId: typeof resolvedOptions.ensurePersistedDeckPlaybackStateActiveSlideId === 'function'
          ? resolvedOptions.ensurePersistedDeckPlaybackStateActiveSlideId
          : ensurePersistedDeckPlaybackStateActiveSlideId,
        getSlides: typeof resolvedOptions.getSlides === 'function'
          ? resolvedOptions.getSlides
          : getSlides,
        slideIdAttr: typeof resolvedOptions.slideIdAttr === 'string'
          ? resolvedOptions.slideIdAttr
          : slideIdAttr,
        resolveFallbackActiveSlideId: doc && resolveFallbackActiveSlideId
          ? () => resolveFallbackActiveSlideId(doc, canonicalDeck)
          : null
      };
      if (createStudioPersistedDeckPlaybackStateCapturer) {
        const capturer = createStudioPersistedDeckPlaybackStateCapturer(captureOptions);
        return typeof capturer === 'function' ? capturer(doc) : null;
      }
      if (captureOptions.capturePlaybackState) {
        return captureOptions.capturePlaybackState(doc, captureOptions);
      }
      if (captureOptions.capturePersistedDeckPlaybackStateWithFallback) {
        return captureOptions.capturePersistedDeckPlaybackStateWithFallback(doc, {
          getSlides: captureOptions.getSlides,
          slideIdAttr: captureOptions.slideIdAttr,
          resolveFallbackActiveSlideId: captureOptions.resolveFallbackActiveSlideId
        });
      }
      if (!captureOptions.capturePersistedDeckPlaybackState) return null;
      const playbackState = captureOptions.capturePersistedDeckPlaybackState(doc, {
        getSlides: captureOptions.getSlides,
        slideIdAttr: captureOptions.slideIdAttr
      });
      if (!doc) return playbackState;
      if (captureOptions.ensurePersistedDeckPlaybackStateActiveSlideId) {
        return captureOptions.ensurePersistedDeckPlaybackStateActiveSlideId(playbackState, {
          resolveFallbackActiveSlideId: captureOptions.resolveFallbackActiveSlideId
        });
      }
      return playbackState;
    };
  }

  function createStudioEditorSaveRequestBodyAdapter(options = {}) {
    const persistenceApi = options.persistenceApi && typeof options.persistenceApi === 'object'
      ? options.persistenceApi
      : null;
    const defaultGetPresentationUrl = typeof options.getPresentationUrl === 'function'
      ? options.getPresentationUrl
      : () => '';
    const defaultResolveSaveRequestDeckState = typeof options.resolveSaveRequestDeckState === 'function'
      ? options.resolveSaveRequestDeckState
      : persistenceApi
        && typeof persistenceApi.resolveStudioSaveRequestDeckState === 'function'
        ? persistenceApi.resolveStudioSaveRequestDeckState
        : null;
    const defaultBuildSaveRequestBody = typeof options.buildSaveRequestBody === 'function'
      ? options.buildSaveRequestBody
      : persistenceApi
        && typeof persistenceApi.buildStudioSaveRequestBody === 'function'
        ? persistenceApi.buildStudioSaveRequestBody
        : null;
    const defaultCapturePersistableDeckState = typeof options.capturePersistableDeckState === 'function'
      ? options.capturePersistableDeckState
      : null;
    const defaultResolveCanonicalDeck = typeof options.resolveCanonicalDeck === 'function'
      ? options.resolveCanonicalDeck
      : (canonicalDeck) => canonicalDeck || null;
    const defaultBuildPersistableDeckHtml = typeof options.buildPersistableDeckHtml === 'function'
      ? options.buildPersistableDeckHtml
      : () => '';

    return function buildEditorSaveRequestBody(doc = null, cleanHtml = null, nextOptions = {}) {
      const resolvedOptions = nextOptions && typeof nextOptions === 'object'
        ? nextOptions
        : {};
      const resolveSaveRequestDeckState = typeof resolvedOptions.resolveStudioSaveRequestDeckState === 'function'
        ? resolvedOptions.resolveStudioSaveRequestDeckState
        : defaultResolveSaveRequestDeckState;
      const buildSaveRequestBody = typeof resolvedOptions.buildStudioSaveRequestBody === 'function'
        ? resolvedOptions.buildStudioSaveRequestBody
        : defaultBuildSaveRequestBody;
      const capturePersistableDeckState = typeof resolvedOptions.capturePersistableDeckState === 'function'
        ? resolvedOptions.capturePersistableDeckState
        : defaultCapturePersistableDeckState;
      const resolveCanonicalDeck = typeof resolvedOptions.resolveCanonicalDeck === 'function'
        ? resolvedOptions.resolveCanonicalDeck
        : defaultResolveCanonicalDeck;
      const buildPersistableDeckHtml = typeof resolvedOptions.buildPersistableDeckHtml === 'function'
        ? resolvedOptions.buildPersistableDeckHtml
        : defaultBuildPersistableDeckHtml;
      const createStudioSaveRequestBodyBuilder = persistenceApi
        && typeof persistenceApi.createStudioSaveRequestBodyBuilder === 'function'
        ? persistenceApi.createStudioSaveRequestBodyBuilder
        : null;
      if (createStudioSaveRequestBodyBuilder) {
        const builder = createStudioSaveRequestBodyBuilder({
          getPresentationUrl: defaultGetPresentationUrl,
          resolveSaveRequestDeckState,
          buildSaveRequestBody,
          capturePersistableDeckState,
          resolveCanonicalDeck,
          buildPersistableDeckHtml
        });
        return typeof builder === 'function'
          ? builder(doc, cleanHtml, resolvedOptions)
          : null;
      }
      if (!resolveSaveRequestDeckState || !buildSaveRequestBody) return null;
      const resolvedDeckState = resolveSaveRequestDeckState(doc, cleanHtml, {
        canonicalDeck: Object.prototype.hasOwnProperty.call(resolvedOptions, 'canonicalDeck')
          ? resolvedOptions.canonicalDeck
          : null,
        capturePersistableDeckState,
        resolveCanonicalDeck,
        buildPersistableDeckHtml
      });
      return buildSaveRequestBody(
        Object.prototype.hasOwnProperty.call(resolvedOptions, 'presentationUrl')
          ? resolvedOptions.presentationUrl
          : defaultGetPresentationUrl(),
        resolvedDeckState.cleanHtml,
        {
          isAutoSave: !!resolvedOptions.isAutoSave,
          versionLabel: resolvedOptions.versionLabel,
          canonicalDeck: resolvedDeckState.canonicalDeck
        }
      );
    };
  }

  function createStudioEditorPersistedDeckHtmlCheckerAdapter(options = {}) {
    const persistenceApi = options.persistenceApi && typeof options.persistenceApi === 'object'
      ? options.persistenceApi
      : null;
    const readPersistedDeckState = typeof options.readPersistedDeckState === 'function'
      ? options.readPersistedDeckState
      : () => options.persistedDeckState || {};
    const isPersistedDeckHtml = typeof options.isPersistedDeckHtml === 'function'
      ? options.isPersistedDeckHtml
      : persistenceApi
        && typeof persistenceApi.isStudioPersistedDeckHtml === 'function'
        ? persistenceApi.isStudioPersistedDeckHtml
        : null;

    return function isEditorPersistedDeckHtml(cleanHtml = '', nextOptions = {}) {
      const resolvedOptions = nextOptions && typeof nextOptions === 'object'
        ? nextOptions
        : {};
      const currentReadPersistedDeckState = typeof resolvedOptions.readPersistedDeckState === 'function'
        ? resolvedOptions.readPersistedDeckState
        : readPersistedDeckState;
      const currentIsPersistedDeckHtml = typeof resolvedOptions.isPersistedDeckHtml === 'function'
        ? resolvedOptions.isPersistedDeckHtml
        : isPersistedDeckHtml;
      const createStudioPersistedDeckHtmlChecker = persistenceApi
        && typeof persistenceApi.createStudioPersistedDeckHtmlChecker === 'function'
        ? persistenceApi.createStudioPersistedDeckHtmlChecker
        : null;
      if (createStudioPersistedDeckHtmlChecker) {
        const checker = createStudioPersistedDeckHtmlChecker({
          readPersistedDeckState: currentReadPersistedDeckState,
          isPersistedDeckHtml: currentIsPersistedDeckHtml
        });
        return typeof checker === 'function'
          ? checker(cleanHtml, resolvedOptions)
          : null;
      }
      if (!currentIsPersistedDeckHtml) return null;
      return currentIsPersistedDeckHtml(cleanHtml, currentReadPersistedDeckState());
    };
  }

  function createStudioEditorPersistedSaveRequestCheckerAdapter(options = {}) {
    const persistenceApi = options.persistenceApi && typeof options.persistenceApi === 'object'
      ? options.persistenceApi
      : null;
    const readPersistedDeckState = typeof options.readPersistedDeckState === 'function'
      ? options.readPersistedDeckState
      : () => options.persistedDeckState || {};
    const isPersistedSaveRequest = typeof options.isPersistedSaveRequest === 'function'
      ? options.isPersistedSaveRequest
      : persistenceApi
        && typeof persistenceApi.isStudioPersistedSaveRequest === 'function'
        ? persistenceApi.isStudioPersistedSaveRequest
        : null;

    return function isEditorPersistedSaveRequest(
      saveRequestBody = null,
      cleanHtml = saveRequestBody && saveRequestBody.htmlContent,
      nextOptions = {}
    ) {
      const resolvedOptions = nextOptions && typeof nextOptions === 'object'
        ? nextOptions
        : {};
      const currentReadPersistedDeckState = typeof resolvedOptions.readPersistedDeckState === 'function'
        ? resolvedOptions.readPersistedDeckState
        : readPersistedDeckState;
      const currentIsPersistedSaveRequest = typeof resolvedOptions.isPersistedSaveRequest === 'function'
        ? resolvedOptions.isPersistedSaveRequest
        : isPersistedSaveRequest;
      const createStudioPersistedSaveRequestChecker = persistenceApi
        && typeof persistenceApi.createStudioPersistedSaveRequestChecker === 'function'
        ? persistenceApi.createStudioPersistedSaveRequestChecker
        : null;
      if (createStudioPersistedSaveRequestChecker) {
        const checker = createStudioPersistedSaveRequestChecker({
          readPersistedDeckState: currentReadPersistedDeckState,
          isPersistedSaveRequest: currentIsPersistedSaveRequest
        });
        return typeof checker === 'function'
          ? checker(saveRequestBody, cleanHtml, resolvedOptions)
          : null;
      }
      if (!currentIsPersistedSaveRequest) return null;
      return currentIsPersistedSaveRequest(
        saveRequestBody,
        currentReadPersistedDeckState(),
        cleanHtml,
        resolvedOptions
      );
    };
  }

  return {
    createStudioEditorPersistedDeckStateAdapter,
    createStudioEditorPersistedDeckStateApplierAdapter,
    createStudioEditorPersistedDeckStateReaderAdapter,
    createStudioEditorPersistedActiveSlideIdAdapter,
    createStudioEditorFallbackCanonicalDeckAdapter,
    createStudioEditorCanonicalDeckOverrideAdapter,
    createStudioEditorReusablePersistedHtmlAdapter,
    createStudioEditorMetadataPersistenceOptionsAdapter,
    createStudioEditorPersistableDeckSanitizerOptionsAdapter,
    createStudioEditorReusablePersistedHtmlSanitizerAdapter,
    createStudioEditorCapturedPersistableDeckStateResolverAdapter,
    createStudioEditorPersistableDeckBuildStateCapturerAdapter,
    createStudioEditorPersistableDeckStateCapturerAdapter,
    createStudioEditorPersistedDeckPlaybackStateCapturerAdapter,
    createStudioEditorSaveRequestBodyAdapter,
    createStudioEditorPersistedDeckHtmlCheckerAdapter,
    createStudioEditorPersistedSaveRequestCheckerAdapter
  };
});
