(function initStudioEditorPersistableDeckBuildStateAction(root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
    return;
  }
  root.SlideNextStudioEditorPersistableDeckBuildStateAction = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function createApi() {
  function notifyResolvedBuildState(callback, value) {
    if (typeof callback !== 'function') return;
    try {
      callback(value);
    } catch (err) {
      // Session/UI synchronization is secondary; preserve the captured build state.
    }
  }

  function createStudioEditorPersistableDeckBuildStateAction(options = {}) {
    const getDocument = typeof options.getDocument === 'function'
      ? options.getDocument
      : () => null;
    const getPersistenceController = typeof options.getPersistenceController === 'function'
      ? options.getPersistenceController
      : () => options.persistenceController || null;
    const persistenceStateApi = options.persistenceStateApi || null;
    const persistenceApi = options.persistenceApi || null;
    const defaultBuildPersistableDeckHtml = typeof options.buildPersistableDeckHtml === 'function'
      ? options.buildPersistableDeckHtml
      : null;
    const getBuildPersistableDeckHtml = typeof options.getBuildPersistableDeckHtml === 'function'
      ? options.getBuildPersistableDeckHtml
      : () => defaultBuildPersistableDeckHtml;
    let buildStateAdapter = null;

    function captureEditorPersistableDeckBuildState(
      doc = getDocument(),
      buildOptions = {}
    ) {
      const nextBuildOptions = buildOptions && typeof buildOptions === 'object'
        ? buildOptions
        : {};
      const buildPersistableDeckHtml = getBuildPersistableDeckHtml();
      const persistenceController = getPersistenceController();
      if (persistenceController
        && typeof persistenceController.capturePersistableDeckBuildState === 'function') {
        const capturedState = persistenceController.capturePersistableDeckBuildState(doc, {
          ...nextBuildOptions,
          buildPersistableDeckHtml
        });
        if (capturedState !== null && typeof capturedState !== 'undefined') {
          return capturedState;
        }
      }

      const createBuildStateAdapter = persistenceStateApi
        && typeof persistenceStateApi.createStudioEditorPersistableDeckBuildStateCapturerAdapter === 'function'
        ? persistenceStateApi.createStudioEditorPersistableDeckBuildStateCapturerAdapter
        : null;
      if (createBuildStateAdapter) {
        if (typeof buildStateAdapter !== 'function') {
          buildStateAdapter = createBuildStateAdapter({
            persistenceApi,
            buildPersistableDeckHtml
          });
        }
        const capturedState = typeof buildStateAdapter === 'function'
          ? buildStateAdapter(doc, nextBuildOptions)
          : null;
        if (capturedState !== null && typeof capturedState !== 'undefined') {
          return capturedState;
        }
      }

      const createStudioPersistableDeckBuildStateCapturer = persistenceApi
        && typeof persistenceApi.createStudioPersistableDeckBuildStateCapturer === 'function'
        ? persistenceApi.createStudioPersistableDeckBuildStateCapturer
        : null;
      if (createStudioPersistableDeckBuildStateCapturer) {
        return createStudioPersistableDeckBuildStateCapturer({
          capturePersistableDeckBuildState: (
            typeof nextBuildOptions.captureStudioPersistableDeckBuildState === 'function'
              ? nextBuildOptions.captureStudioPersistableDeckBuildState
              : persistenceApi
                && typeof persistenceApi.captureStudioPersistableDeckBuildState === 'function'
                ? persistenceApi.captureStudioPersistableDeckBuildState
                : null
          ),
          buildPersistableDeckHtml
        })(doc, nextBuildOptions);
      }

      const captureStudioPersistableDeckBuildState = persistenceApi
        && typeof persistenceApi.captureStudioPersistableDeckBuildState === 'function'
        ? persistenceApi.captureStudioPersistableDeckBuildState
        : null;
      if (captureStudioPersistableDeckBuildState) {
        return captureStudioPersistableDeckBuildState(doc, {
          ...nextBuildOptions,
          buildPersistableDeckHtml
        });
      }

      const onCanonicalDeckResolved = typeof nextBuildOptions.onCanonicalDeckResolved === 'function'
        ? nextBuildOptions.onCanonicalDeckResolved
        : null;
      const onPlaybackStateResolved = typeof nextBuildOptions.onPlaybackStateResolved === 'function'
        ? nextBuildOptions.onPlaybackStateResolved
        : null;
      let resolvedCanonicalDeck = null;
      let resolvedPlaybackState;
      const cleanHtml = buildPersistableDeckHtml(doc, {
        ...nextBuildOptions,
        onCanonicalDeckResolved(canonicalDeck) {
          resolvedCanonicalDeck = canonicalDeck;
          notifyResolvedBuildState(onCanonicalDeckResolved, canonicalDeck);
        },
        onPlaybackStateResolved(playbackState) {
          resolvedPlaybackState = playbackState;
          notifyResolvedBuildState(onPlaybackStateResolved, playbackState);
        }
      });
      return {
        cleanHtml,
        canonicalDeck: resolvedCanonicalDeck,
        playbackState: resolvedPlaybackState
      };
    }

    return captureEditorPersistableDeckBuildState;
  }

  function createStudioEditorPersistableDeckBuildStateGlobalApi(options = {}) {
    const captureEditorPersistableDeckBuildState =
      typeof options.captureEditorPersistableDeckBuildState === 'function'
        ? options.captureEditorPersistableDeckBuildState
        : null;
    return {
      captureEditorPersistableDeckBuildState: (...args) => captureEditorPersistableDeckBuildState
        ? captureEditorPersistableDeckBuildState(...args)
        : null
    };
  }

  return {
    createStudioEditorPersistableDeckBuildStateAction,
    createStudioEditorPersistableDeckBuildStateGlobalApi
  };
}));
