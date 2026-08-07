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

  return {
    createStudioEditorPersistedDeckStateAdapter,
    createStudioEditorPersistedDeckStateApplierAdapter,
    createStudioEditorPersistedDeckStateReaderAdapter,
    createStudioEditorPersistedActiveSlideIdAdapter,
    createStudioEditorFallbackCanonicalDeckAdapter,
    createStudioEditorCanonicalDeckOverrideAdapter,
    createStudioEditorReusablePersistedHtmlAdapter
  };
});
