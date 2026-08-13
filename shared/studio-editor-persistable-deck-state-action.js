(function initStudioEditorPersistableDeckStateAction(root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
    return;
  }
  root.SlideNextStudioEditorPersistableDeckStateAction = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function createApi() {
  function createStudioEditorPersistableDeckStateAction(options = {}) {
    const getDocument = typeof options.getDocument === 'function'
      ? options.getDocument
      : () => null;
    const getPersistenceController = typeof options.getPersistenceController === 'function'
      ? options.getPersistenceController
      : () => options.persistenceController || null;
    const persistenceStateApi = options.persistenceStateApi || null;
    const persistenceApi = options.persistenceApi || null;
    const getCaptureBuildState = typeof options.getCaptureBuildState === 'function'
      ? options.getCaptureBuildState
      : () => null;
    const getResolveCapturedState = typeof options.getResolveCapturedState === 'function'
      ? options.getResolveCapturedState
      : () => null;
    const getCapturePlaybackState = typeof options.getCapturePlaybackState === 'function'
      ? options.getCapturePlaybackState
      : () => null;
    const resolveCanonicalDeck = typeof options.resolveCanonicalDeck === 'function'
      ? options.resolveCanonicalDeck
      : (canonicalDeck) => canonicalDeck || null;
    let persistableDeckStateAdapter = null;

    function getCapturePersistableDeckState(captureOptions = {}) {
      return typeof captureOptions.captureStudioPersistableDeckState === 'function'
        ? captureOptions.captureStudioPersistableDeckState
        : persistenceApi
          && typeof persistenceApi.captureStudioPersistableDeckState === 'function'
          ? persistenceApi.captureStudioPersistableDeckState
          : null;
    }

    function buildCaptureCallbacks(doc, providedCanonicalDeck) {
      return {
        buildCanonicalDeck: () => resolveCanonicalDeck(providedCanonicalDeck, doc),
        resolvePlaybackState: (nextCanonicalDeck) => {
          const capturePlaybackState = getCapturePlaybackState();
          return typeof capturePlaybackState === 'function'
            ? capturePlaybackState(doc, nextCanonicalDeck)
            : null;
        }
      };
    }

    function captureEditorPersistableDeckState(
      doc = getDocument(),
      captureOptions = {}
    ) {
      const nextCaptureOptions = captureOptions && typeof captureOptions === 'object'
        ? captureOptions
        : {};
      const providedCanonicalDeck = Object.prototype.hasOwnProperty.call(
        nextCaptureOptions,
        'canonicalDeck'
      )
        ? nextCaptureOptions.canonicalDeck
        : null;
      const captureCallbacks = buildCaptureCallbacks(doc, providedCanonicalDeck);
      const captureBuildState = getCaptureBuildState();
      const persistenceController = getPersistenceController();
      if (persistenceController
        && typeof persistenceController.capturePersistableDeckState === 'function') {
        const capturedState = persistenceController.capturePersistableDeckState(doc, {
          canonicalDeck: providedCanonicalDeck,
          captureStudioPersistableDeckState: getCapturePersistableDeckState(nextCaptureOptions),
          captureBuildState,
          ...captureCallbacks
        });
        if (capturedState !== null && typeof capturedState !== 'undefined') {
          return capturedState;
        }
      }

      const createStateAdapter = persistenceStateApi
        && typeof persistenceStateApi.createStudioEditorPersistableDeckStateCapturerAdapter === 'function'
        ? persistenceStateApi.createStudioEditorPersistableDeckStateCapturerAdapter
        : null;
      if (createStateAdapter) {
        if (typeof persistableDeckStateAdapter !== 'function') {
          persistableDeckStateAdapter = createStateAdapter({
            persistenceApi
          });
        }
        const capturedState = typeof persistableDeckStateAdapter === 'function'
          ? persistableDeckStateAdapter(doc, {
              canonicalDeck: providedCanonicalDeck,
              captureStudioPersistableDeckState: getCapturePersistableDeckState(nextCaptureOptions),
              captureBuildState,
              ...captureCallbacks
            })
          : null;
        if (capturedState !== null && typeof capturedState !== 'undefined') {
          return capturedState;
        }
      }

      const createStudioPersistableDeckStateCapturer = persistenceApi
        && typeof persistenceApi.createStudioPersistableDeckStateCapturer === 'function'
        ? persistenceApi.createStudioPersistableDeckStateCapturer
        : null;
      if (createStudioPersistableDeckStateCapturer) {
        return createStudioPersistableDeckStateCapturer({
          capturePersistableDeckState: getCapturePersistableDeckState(nextCaptureOptions),
          captureBuildState,
          ...captureCallbacks
        })(doc, {
          canonicalDeck: providedCanonicalDeck
        });
      }

      const captureStudioPersistableDeckState = persistenceApi
        && typeof persistenceApi.captureStudioPersistableDeckState === 'function'
        ? persistenceApi.captureStudioPersistableDeckState
        : null;
      if (captureStudioPersistableDeckState) {
        return captureStudioPersistableDeckState(doc, {
          canonicalDeck: providedCanonicalDeck,
          captureBuildState,
          ...captureCallbacks
        });
      }

      if (typeof captureBuildState !== 'function') return null;
      const capturedBuildState = captureBuildState(doc, {
        canonicalDeck: providedCanonicalDeck
      });
      const resolveCapturedState = getResolveCapturedState();
      if (typeof resolveCapturedState !== 'function') return null;
      return resolveCapturedState(
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
          ...captureCallbacks
        }
      );
    }

    return captureEditorPersistableDeckState;
  }

  function createStudioEditorPersistableDeckStateGlobalApi(options = {}) {
    const captureEditorPersistableDeckState =
      typeof options.captureEditorPersistableDeckState === 'function'
        ? options.captureEditorPersistableDeckState
        : null;
    return {
      captureEditorPersistableDeckState: (...args) => captureEditorPersistableDeckState
        ? captureEditorPersistableDeckState(...args)
        : null
    };
  }

  return {
    createStudioEditorPersistableDeckStateAction,
    createStudioEditorPersistableDeckStateGlobalApi
  };
}));
