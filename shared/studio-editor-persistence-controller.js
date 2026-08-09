(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorPersistenceController = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function createStudioEditorPersistenceController(options = {}) {
    const hasOption = (name) => Object.prototype.hasOwnProperty.call(options, name);
    const resolveDependency = (name, globalName) => hasOption(name)
      ? options[name]
      : (root && root[globalName]) || null;
    const persistenceApi = resolveDependency(
      'persistenceApi',
      'SlideNextStudioEditorPersistence'
    );
    const persistenceStateApi = resolveDependency(
      'persistenceStateApi',
      'SlideNextStudioEditorPersistenceState'
    );
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
    const currentPresentationUrl = typeof options.currentPresentationUrl === 'string'
      ? options.currentPresentationUrl
      : '';
    const getCurrentPresentationUrl = typeof options.getCurrentPresentationUrl === 'function'
      ? options.getCurrentPresentationUrl
      : () => currentPresentationUrl;
    const createHandlerOptions = typeof options.createHandlerOptions === 'function'
      ? options.createHandlerOptions
      : null;
    const setCurrentPresentationCanonicalDeck = typeof options.setCurrentPresentationCanonicalDeck === 'function'
      ? options.setCurrentPresentationCanonicalDeck
      : () => {};
    const isCanonicalDeck = typeof options.isCanonicalDeck === 'function'
      ? options.isCanonicalDeck
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
    const getSlides = typeof options.getSlides === 'function'
      ? options.getSlides
      : null;
    const slideIdAttr = typeof options.slideIdAttr === 'string'
      ? options.slideIdAttr
      : '';
    const resolveFallbackActiveSlideId = typeof options.resolveFallbackActiveSlideId === 'function'
      ? options.resolveFallbackActiveSlideId
      : null;

    let stateUpdater = null;
    let stateApplier = null;
    let stateReader = null;
    let activeSlideIdReader = null;
    let playbackStateCapturer = null;
    let persistableDeckStateCapturer = null;
    let persistenceStateFromCaptureResolver = null;
    let persistenceSuccessHandler = null;
    let canonicalDeckOverrideResolver = null;
    let fallbackCanonicalDeckResolver = null;

    function createStateUpdater() {
      if (!persistenceStateApi
        || typeof persistenceStateApi.createStudioEditorPersistedDeckStateAdapter !== 'function') {
        return null;
      }
      return persistenceStateApi.createStudioEditorPersistedDeckStateAdapter({
        persistenceApi,
        resolveCanonicalDeck,
        normalizePlaybackState,
        setPersistedDeckHtml,
        setPersistedCanonicalDeck,
        setPersistedPlaybackState
      });
    }

    function update(nextState = {}) {
      if (typeof stateUpdater !== 'function') {
        stateUpdater = createStateUpdater();
      }
      return typeof stateUpdater === 'function' ? stateUpdater(nextState) : {};
    }

    function createStateReader() {
      if (!persistenceStateApi
        || typeof persistenceStateApi.createStudioEditorPersistedDeckStateReaderAdapter !== 'function') {
        return null;
      }
      return persistenceStateApi.createStudioEditorPersistedDeckStateReaderAdapter({
        persistenceApi,
        getPersistedDeckHtml,
        getPersistedCanonicalDeck,
        getPersistedPlaybackState
      });
    }

    function read() {
      if (typeof stateReader !== 'function') {
        stateReader = createStateReader();
      }
      return typeof stateReader === 'function'
        ? stateReader()
        : {
            cleanHtml: '',
            canonicalDeck: null,
            playbackState: null
          };
    }

    function resolveWithContent(persistedDeckState = read()) {
      if (typeof stateReader !== 'function') {
        read();
      }
      return stateReader
        && typeof stateReader.resolveWithContent === 'function'
        ? stateReader.resolveWithContent(persistedDeckState)
        : null;
    }

    function resolvePersistedDeckStateWithContent(persistedDeckState = read()) {
      if (typeof stateReader !== 'function') {
        read();
      }
      return stateReader
        && typeof stateReader.resolvePersistedDeckStateWithContent === 'function'
        ? stateReader.resolvePersistedDeckStateWithContent(persistedDeckState)
        : null;
    }

    function createActiveSlideIdReader() {
      if (!persistenceStateApi
        || typeof persistenceStateApi.createStudioEditorPersistedActiveSlideIdAdapter !== 'function') {
        return null;
      }
      return persistenceStateApi.createStudioEditorPersistedActiveSlideIdAdapter({
        persistenceApi,
        getPlaybackState: getPersistedPlaybackState
      });
    }

    function getPersistedActiveSlideId(playbackState = getPersistedPlaybackState()) {
      if (typeof activeSlideIdReader !== 'function') {
        activeSlideIdReader = createActiveSlideIdReader();
      }
      return typeof activeSlideIdReader === 'function'
        ? activeSlideIdReader(playbackState)
        : '';
    }

    function createPlaybackStateCapturer() {
      if (!persistenceStateApi
        || typeof persistenceStateApi.createStudioEditorPersistedDeckPlaybackStateCapturerAdapter !== 'function') {
        return null;
      }
      return persistenceStateApi.createStudioEditorPersistedDeckPlaybackStateCapturerAdapter({
        persistenceApi,
        deckPersistenceApi: options.deckPersistenceApi || null,
        getSlides,
        slideIdAttr,
        resolveFallbackActiveSlideId
      });
    }

    function capturePersistedDeckPlaybackState(doc = null, nextOptions = {}) {
      if (typeof playbackStateCapturer !== 'function') {
        playbackStateCapturer = createPlaybackStateCapturer();
      }
      return typeof playbackStateCapturer === 'function'
        ? playbackStateCapturer(doc, nextOptions)
        : null;
    }

    function createPersistableDeckStateCapturer() {
      if (!persistenceStateApi
        || typeof persistenceStateApi.createStudioEditorPersistableDeckStateCapturerAdapter !== 'function') {
        return null;
      }
      return persistenceStateApi.createStudioEditorPersistableDeckStateCapturerAdapter({
        persistenceApi
      });
    }

    function capturePersistableDeckState(doc = null, nextOptions = {}) {
      if (typeof persistableDeckStateCapturer !== 'function') {
        persistableDeckStateCapturer = createPersistableDeckStateCapturer();
      }
      return typeof persistableDeckStateCapturer === 'function'
        ? persistableDeckStateCapturer(doc, nextOptions)
        : null;
    }

    function createPersistenceStateFromCaptureResolver() {
      if (!persistenceStateApi
        || typeof persistenceStateApi.createStudioEditorPersistenceStateFromDocumentCaptureResolverAdapter !== 'function') {
        return null;
      }
      return persistenceStateApi.createStudioEditorPersistenceStateFromDocumentCaptureResolverAdapter({
        persistenceApi,
        getPresentationUrl: getCurrentPresentationUrl,
        capturePersistableDeckState: options.capturePersistableDeckState || null
      });
    }

    function resolvePersistenceStateFromCapture(doc = null, nextOptions = {}) {
      if (typeof persistenceStateFromCaptureResolver !== 'function') {
        persistenceStateFromCaptureResolver = createPersistenceStateFromCaptureResolver();
      }
      return typeof persistenceStateFromCaptureResolver === 'function'
        ? persistenceStateFromCaptureResolver(doc, nextOptions)
        : null;
    }

    function createPersistenceSuccessHandler() {
      if (!persistenceStateApi
        || typeof persistenceStateApi.createStudioEditorPersistenceSuccessHandlerAdapter !== 'function') {
        return null;
      }
      return persistenceStateApi.createStudioEditorPersistenceSuccessHandlerAdapter({
        persistenceApi,
        createHandlerOptions
      });
    }

    function handlePersistenceSuccess(persistenceContext = {}, nextOptions = {}) {
      if (typeof persistenceSuccessHandler !== 'function') {
        persistenceSuccessHandler = createPersistenceSuccessHandler();
      }
      return typeof persistenceSuccessHandler === 'function'
        ? persistenceSuccessHandler(persistenceContext, nextOptions)
        : null;
    }

    function createStateApplier() {
      if (!persistenceStateApi
        || typeof persistenceStateApi.createStudioEditorPersistedDeckStateApplierAdapter !== 'function') {
        return null;
      }
      return persistenceStateApi.createStudioEditorPersistedDeckStateApplierAdapter({
        persistenceApi,
        currentPresentationUrl,
        getCurrentPresentationUrl,
        updatePersistedDeckState: update,
        setCurrentPresentationCanonicalDeck
      });
    }

    function apply(nextState = {}, nextOptions = {}) {
      if (typeof stateApplier !== 'function') {
        stateApplier = createStateApplier();
      }
      return typeof stateApplier === 'function' ? stateApplier(nextState, nextOptions) : nextState;
    }

    function createCanonicalDeckOverrideResolver() {
      if (!persistenceStateApi
        || typeof persistenceStateApi.createStudioEditorCanonicalDeckOverrideAdapter !== 'function') {
        return null;
      }
      return persistenceStateApi.createStudioEditorCanonicalDeckOverrideAdapter({
        persistenceApi,
        isCanonicalDeck
      });
    }

    function resolveCanonicalDeckOverride(canonicalDeck = null, nextOptions = {}) {
      if (typeof canonicalDeckOverrideResolver !== 'function') {
        canonicalDeckOverrideResolver = createCanonicalDeckOverrideResolver();
      }
      return typeof canonicalDeckOverrideResolver === 'function'
        ? canonicalDeckOverrideResolver(canonicalDeck, nextOptions)
        : null;
    }

    function createFallbackCanonicalDeckResolver() {
      if (!persistenceStateApi
        || typeof persistenceStateApi.createStudioEditorFallbackCanonicalDeckAdapter !== 'function') {
        return null;
      }
      return persistenceStateApi.createStudioEditorFallbackCanonicalDeckAdapter({
        persistenceApi,
        isCanonicalDeck
      });
    }

    function resolveFallbackCanonicalDeck(canonicalDeck = null, nextOptions = {}) {
      if (typeof fallbackCanonicalDeckResolver !== 'function') {
        fallbackCanonicalDeckResolver = createFallbackCanonicalDeckResolver();
      }
      return typeof fallbackCanonicalDeckResolver === 'function'
        ? fallbackCanonicalDeckResolver(canonicalDeck, nextOptions)
        : null;
    }

    return {
      read,
      resolveWithContent,
      resolvePersistedDeckStateWithContent,
      getPersistedActiveSlideId,
      capturePersistedDeckPlaybackState,
      capturePersistableDeckState,
      resolvePersistenceStateFromCapture,
      handlePersistenceSuccess,
      update,
      apply,
      resolveCanonicalDeckOverride,
      resolveFallbackCanonicalDeck
    };
  }

  return {
    createStudioEditorPersistenceController
  };
});
