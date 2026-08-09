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
    const currentSessionToken = Number.isInteger(options.currentSessionToken)
      ? options.currentSessionToken
      : null;
    const getCurrentSessionToken = typeof options.getCurrentSessionToken === 'function'
      ? options.getCurrentSessionToken
      : () => currentSessionToken;
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
    const createHandlerOptions = typeof options.createHandlerOptions === 'function'
      ? options.createHandlerOptions
      : null;
    const createVersionHandlerOptions = typeof options.createVersionHandlerOptions === 'function'
      ? options.createVersionHandlerOptions
      : createHandlerOptions;
    const createSessionReaderOptions = typeof options.createSessionReaderOptions === 'function'
      ? options.createSessionReaderOptions
      : null;
    const applyPersistedDeckState = typeof options.applyPersistedDeckState === 'function'
      ? options.applyPersistedDeckState
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
    let persistedDeckHtmlChecker = null;
    let persistedSaveRequestChecker = null;
    let reusablePersistedHtmlResolver = null;
    let saveRequestBodyBuilder = null;
    let reusablePersistedHtmlSanitizer = null;
    let persistableDeckSanitizerOptionsBuilder = null;
    let metadataPersistenceOptionsResolver = null;
    let persistableDeckBuildStateCapturer = null;
    let capturedPersistableDeckStateResolver = null;
    let playbackStateCapturer = null;
    let persistableDeckStateCapturer = null;
    let persistenceStateFromCaptureResolver = null;
    let persistenceFailureHandler = null;
    let persistenceSuccessHandler = null;
    let versionPersistenceSuccessHandler = null;
    let persistenceTaskStaleChecker = null;
    let persistenceActionCurrentRunner = null;
    let persistenceHandlerOptionsBuilder = null;
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

    function createPersistedDeckHtmlChecker() {
      if (!persistenceStateApi
        || typeof persistenceStateApi.createStudioEditorPersistedDeckHtmlCheckerAdapter !== 'function') {
        return null;
      }
      return persistenceStateApi.createStudioEditorPersistedDeckHtmlCheckerAdapter({
        persistenceApi,
        readPersistedDeckState: read
      });
    }

    function isPersistedDeckHtml(cleanHtml = '', nextOptions = {}) {
      if (typeof persistedDeckHtmlChecker !== 'function') {
        persistedDeckHtmlChecker = createPersistedDeckHtmlChecker();
      }
      return typeof persistedDeckHtmlChecker === 'function'
        ? persistedDeckHtmlChecker(cleanHtml, nextOptions)
        : null;
    }

    function createPersistedSaveRequestChecker() {
      if (!persistenceStateApi
        || typeof persistenceStateApi.createStudioEditorPersistedSaveRequestCheckerAdapter !== 'function') {
        return null;
      }
      return persistenceStateApi.createStudioEditorPersistedSaveRequestCheckerAdapter({
        persistenceApi,
        readPersistedDeckState: read
      });
    }

    function isPersistedSaveRequest(
      saveRequestBody = null,
      cleanHtml = saveRequestBody && saveRequestBody.htmlContent,
      nextOptions = {}
    ) {
      if (typeof persistedSaveRequestChecker !== 'function') {
        persistedSaveRequestChecker = createPersistedSaveRequestChecker();
      }
      return typeof persistedSaveRequestChecker === 'function'
        ? persistedSaveRequestChecker(saveRequestBody, cleanHtml, nextOptions)
        : null;
    }

    function createReusablePersistedHtmlResolver() {
      if (!persistenceStateApi
        || typeof persistenceStateApi.createStudioEditorReusablePersistedHtmlAdapter !== 'function') {
        return null;
      }
      return persistenceStateApi.createStudioEditorReusablePersistedHtmlAdapter({
        persistenceApi
      });
    }

    function resolveReusablePersistedHtml(persistedDeckState = {}, nextOptions = {}) {
      if (typeof reusablePersistedHtmlResolver !== 'function') {
        reusablePersistedHtmlResolver = createReusablePersistedHtmlResolver();
      }
      return typeof reusablePersistedHtmlResolver === 'function'
        ? reusablePersistedHtmlResolver(persistedDeckState, nextOptions)
        : null;
    }

    function createSaveRequestBodyBuilder() {
      if (!persistenceStateApi
        || typeof persistenceStateApi.createStudioEditorSaveRequestBodyAdapter !== 'function') {
        return null;
      }
      return persistenceStateApi.createStudioEditorSaveRequestBodyAdapter({
        persistenceApi,
        getPresentationUrl: getCurrentPresentationUrl
      });
    }

    function buildSaveRequestBody(doc = null, cleanHtml = null, nextOptions = {}) {
      if (typeof saveRequestBodyBuilder !== 'function') {
        saveRequestBodyBuilder = createSaveRequestBodyBuilder();
      }
      return typeof saveRequestBodyBuilder === 'function'
        ? saveRequestBodyBuilder(doc, cleanHtml, nextOptions)
        : null;
    }

    function createReusablePersistedHtmlSanitizer() {
      if (!persistenceStateApi
        || typeof persistenceStateApi.createStudioEditorReusablePersistedHtmlSanitizerAdapter !== 'function') {
        return null;
      }
      return persistenceStateApi.createStudioEditorReusablePersistedHtmlSanitizerAdapter({
        persistenceApi
      });
    }

    function sanitizeReusablePersistedHtml(persistedHtml, nextOptions = {}) {
      if (typeof reusablePersistedHtmlSanitizer !== 'function') {
        reusablePersistedHtmlSanitizer = createReusablePersistedHtmlSanitizer();
      }
      return typeof reusablePersistedHtmlSanitizer === 'function'
        ? reusablePersistedHtmlSanitizer(persistedHtml, nextOptions)
        : null;
    }

    function createPersistableDeckSanitizerOptionsBuilder() {
      if (!persistenceStateApi
        || typeof persistenceStateApi.createStudioEditorPersistableDeckSanitizerOptionsAdapter !== 'function') {
        return null;
      }
      return persistenceStateApi.createStudioEditorPersistableDeckSanitizerOptionsAdapter({
        persistenceApi
      });
    }

    function buildPersistableDeckSanitizerOptions(playbackState = null, nextOptions = {}) {
      if (typeof persistableDeckSanitizerOptionsBuilder !== 'function') {
        persistableDeckSanitizerOptionsBuilder = createPersistableDeckSanitizerOptionsBuilder();
      }
      return typeof persistableDeckSanitizerOptionsBuilder === 'function'
        ? persistableDeckSanitizerOptionsBuilder(playbackState, nextOptions)
        : null;
    }

    function createMetadataPersistenceOptionsResolver() {
      if (!persistenceStateApi
        || typeof persistenceStateApi.createStudioEditorMetadataPersistenceOptionsAdapter !== 'function') {
        return null;
      }
      return persistenceStateApi.createStudioEditorMetadataPersistenceOptionsAdapter({
        persistenceApi,
        getCurrentPresentationMetadata,
        resolveMergedPresentationPersistenceOptions,
        resolvePresentationPersistenceOptions,
        mergePresentationPersistenceOptions
      });
    }

    function resolveMetadataPersistenceOptions(nextOptions = {}) {
      if (typeof metadataPersistenceOptionsResolver !== 'function') {
        metadataPersistenceOptionsResolver = createMetadataPersistenceOptionsResolver();
      }
      return typeof metadataPersistenceOptionsResolver === 'function'
        ? metadataPersistenceOptionsResolver(nextOptions)
        : null;
    }

    function createPersistableDeckBuildStateCapturer() {
      if (!persistenceStateApi
        || typeof persistenceStateApi.createStudioEditorPersistableDeckBuildStateCapturerAdapter !== 'function') {
        return null;
      }
      return persistenceStateApi.createStudioEditorPersistableDeckBuildStateCapturerAdapter({
        persistenceApi
      });
    }

    function capturePersistableDeckBuildState(doc = null, nextOptions = {}) {
      if (typeof persistableDeckBuildStateCapturer !== 'function') {
        persistableDeckBuildStateCapturer = createPersistableDeckBuildStateCapturer();
      }
      return typeof persistableDeckBuildStateCapturer === 'function'
        ? persistableDeckBuildStateCapturer(doc, nextOptions)
        : null;
    }

    function createCapturedPersistableDeckStateResolver() {
      if (!persistenceStateApi
        || typeof persistenceStateApi.createStudioEditorCapturedPersistableDeckStateResolverAdapter !== 'function') {
        return null;
      }
      return persistenceStateApi.createStudioEditorCapturedPersistableDeckStateResolverAdapter({
        persistenceApi
      });
    }

    function resolveCapturedPersistableDeckState(cleanHtml = '', nextOptions = {}) {
      if (typeof capturedPersistableDeckStateResolver !== 'function') {
        capturedPersistableDeckStateResolver = createCapturedPersistableDeckStateResolver();
      }
      return typeof capturedPersistableDeckStateResolver === 'function'
        ? capturedPersistableDeckStateResolver(cleanHtml, nextOptions)
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

    function createPersistenceHandlerOptionsBuilder() {
      if (!persistenceStateApi
        || typeof persistenceStateApi.createStudioEditorPersistenceHandlerOptionsAdapter !== 'function'
        || typeof createSessionReaderOptions !== 'function'
        || typeof applyPersistedDeckState !== 'function') {
        return null;
      }
      return persistenceStateApi.createStudioEditorPersistenceHandlerOptionsAdapter({
        persistenceApi,
        getPresentationUrl: getCurrentPresentationUrl,
        createSessionReaderOptions,
        applyPersistedDeckState
      });
    }

    function createPersistenceHandlerOptions(nextOptions = {}) {
      if (typeof persistenceHandlerOptionsBuilder !== 'function') {
        persistenceHandlerOptionsBuilder = createPersistenceHandlerOptionsBuilder();
      }
      if (typeof persistenceHandlerOptionsBuilder === 'function') {
        const result = persistenceHandlerOptionsBuilder(nextOptions);
        if (result !== null && typeof result !== 'undefined') {
          return result;
        }
      }
      return typeof createHandlerOptions === 'function'
        ? createHandlerOptions(nextOptions)
        : nextOptions;
    }

    function createPersistenceSuccessHandler() {
      if (!persistenceStateApi
        || typeof persistenceStateApi.createStudioEditorPersistenceSuccessHandlerAdapter !== 'function') {
        return null;
      }
      return persistenceStateApi.createStudioEditorPersistenceSuccessHandlerAdapter({
        persistenceApi,
        createHandlerOptions: createPersistenceHandlerOptions
      });
    }

    function createPersistenceFailureHandler() {
      if (!persistenceStateApi
        || typeof persistenceStateApi.createStudioEditorPersistenceFailureHandlerAdapter !== 'function') {
        return null;
      }
      return persistenceStateApi.createStudioEditorPersistenceFailureHandlerAdapter({
        persistenceApi,
        createHandlerOptions: createPersistenceHandlerOptions
      });
    }

    function handlePersistenceFailure(persistenceContext = {}, nextOptions = {}) {
      if (typeof persistenceFailureHandler !== 'function') {
        persistenceFailureHandler = createPersistenceFailureHandler();
      }
      return typeof persistenceFailureHandler === 'function'
        ? persistenceFailureHandler(persistenceContext, nextOptions)
        : null;
    }

    function handlePersistenceSuccess(persistenceContext = {}, nextOptions = {}) {
      if (typeof persistenceSuccessHandler !== 'function') {
        persistenceSuccessHandler = createPersistenceSuccessHandler();
      }
      return typeof persistenceSuccessHandler === 'function'
        ? persistenceSuccessHandler(persistenceContext, nextOptions)
        : null;
    }

    function createVersionPersistenceSuccessHandler() {
      if (!persistenceStateApi
        || typeof persistenceStateApi.createStudioEditorVersionPersistenceSuccessHandlerAdapter !== 'function') {
        return null;
      }
      return persistenceStateApi.createStudioEditorVersionPersistenceSuccessHandlerAdapter({
        persistenceApi,
        createHandlerOptions: createVersionHandlerOptions
      });
    }

    function handleVersionPersistenceSuccess(persistenceContext = {}, nextOptions = {}) {
      if (typeof versionPersistenceSuccessHandler !== 'function') {
        versionPersistenceSuccessHandler = createVersionPersistenceSuccessHandler();
      }
      return typeof versionPersistenceSuccessHandler === 'function'
        ? versionPersistenceSuccessHandler(persistenceContext, nextOptions)
        : null;
    }

    function createPersistenceTaskStaleChecker() {
      if (!persistenceStateApi
        || typeof persistenceStateApi.createStudioEditorPersistenceTaskStaleCheckerAdapter !== 'function') {
        return null;
      }
      return persistenceStateApi.createStudioEditorPersistenceTaskStaleCheckerAdapter({
        persistenceApi,
        getPresentationUrl: getCurrentPresentationUrl,
        getSessionToken: getCurrentSessionToken
      });
    }

    function isPersistenceTaskStale(
      presentationUrl = getCurrentPresentationUrl(),
      sessionToken = getCurrentSessionToken(),
      nextOptions = {}
    ) {
      if (typeof persistenceTaskStaleChecker !== 'function') {
        persistenceTaskStaleChecker = createPersistenceTaskStaleChecker();
      }
      return typeof persistenceTaskStaleChecker === 'function'
        ? persistenceTaskStaleChecker(presentationUrl, sessionToken, nextOptions)
        : null;
    }

    function createPersistenceActionCurrentRunner() {
      if (!persistenceStateApi
        || typeof persistenceStateApi.createStudioEditorPersistenceActionCurrentRunnerAdapter !== 'function') {
        return null;
      }
      return persistenceStateApi.createStudioEditorPersistenceActionCurrentRunnerAdapter({
        persistenceApi,
        readCurrentSessionState: () => ({
          getCurrentPresentationUrl,
          getCurrentSessionToken
        })
      });
    }

    function runPersistenceActionIfCurrent(persistenceContext = {}, action = null, nextOptions = {}) {
      if (typeof persistenceActionCurrentRunner !== 'function') {
        persistenceActionCurrentRunner = createPersistenceActionCurrentRunner();
      }
      return typeof persistenceActionCurrentRunner === 'function'
        ? persistenceActionCurrentRunner(persistenceContext, action, nextOptions)
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
      isPersistedDeckHtml,
      isPersistedSaveRequest,
      resolveReusablePersistedHtml,
      buildSaveRequestBody,
      sanitizeReusablePersistedHtml,
      buildPersistableDeckSanitizerOptions,
      resolveMetadataPersistenceOptions,
      capturePersistableDeckBuildState,
      resolveCapturedPersistableDeckState,
      getPersistedActiveSlideId,
      capturePersistedDeckPlaybackState,
      capturePersistableDeckState,
      resolvePersistenceStateFromCapture,
      handlePersistenceFailure,
      handlePersistenceSuccess,
      handleVersionPersistenceSuccess,
      isPersistenceTaskStale,
      runPersistenceActionIfCurrent,
      createPersistenceHandlerOptions,
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
