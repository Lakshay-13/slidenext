(function initStudioEditorPersistenceHandlerOptionsAction(root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
    return;
  }
  root.SlideNextStudioEditorPersistenceHandlerOptionsAction = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function createApi() {
  function createStudioEditorPersistenceHandlerOptionsAction(options = {}) {
    const getPersistenceController = typeof options.getPersistenceController === 'function'
      ? options.getPersistenceController
      : () => options.persistenceController || null;
    const persistenceApi = options.persistenceApi || null;
    const persistenceStateApi = options.persistenceStateApi || null;
    const getPresentationUrl = typeof options.getPresentationUrl === 'function'
      ? options.getPresentationUrl
      : () => '';
    const getCreateSessionReaderOptions =
      typeof options.getCreateSessionReaderOptions === 'function'
        ? options.getCreateSessionReaderOptions
        : () => null;
    const getApplyPersistedDeckState =
      typeof options.getApplyPersistedDeckState === 'function'
        ? options.getApplyPersistedDeckState
        : () => null;
    let handlerOptionsAdapter = null;

    function getFunction(api, name) {
      return api && typeof api[name] === 'function' ? api[name] : null;
    }

    function createCurrentStudioPersistenceHandlerOptions(options = {}) {
      const resolvedOptions = options && typeof options === 'object' ? options : {};
      const persistenceController = typeof getPersistenceController === 'function'
        ? getPersistenceController()
        : null;
      if (persistenceController
        && typeof persistenceController.createPersistenceHandlerOptions === 'function') {
        const result = persistenceController.createPersistenceHandlerOptions(resolvedOptions);
        if (result !== null && typeof result !== 'undefined') {
          return result;
        }
      }

      const createHandlerOptionsAdapter = getFunction(
        persistenceStateApi,
        'createStudioEditorPersistenceHandlerOptionsAdapter'
      );
      if (createHandlerOptionsAdapter) {
        if (typeof handlerOptionsAdapter !== 'function') {
          handlerOptionsAdapter = createHandlerOptionsAdapter({
            persistenceApi,
            getPresentationUrl,
            createSessionReaderOptions: getCreateSessionReaderOptions(),
            applyPersistedDeckState: getApplyPersistedDeckState()
          });
        }
        const result = typeof handlerOptionsAdapter === 'function'
          ? handlerOptionsAdapter(resolvedOptions)
          : null;
        if (result !== null && typeof result !== 'undefined') {
          return result;
        }
      }

      const createPersistenceHandlerOptionsBuilder = getFunction(
        persistenceApi,
        'createStudioPersistenceHandlerOptionsBuilder'
      );
      if (createPersistenceHandlerOptionsBuilder) {
        return createPersistenceHandlerOptionsBuilder({
          getPresentationUrl,
          createSessionReaderOptions: getCreateSessionReaderOptions(),
          applyPersistedDeckState: getApplyPersistedDeckState()
        })(resolvedOptions);
      }

      const createSessionReaderOptions = getCreateSessionReaderOptions();
      const applyPersistedDeckState = getApplyPersistedDeckState();
      if (typeof createSessionReaderOptions !== 'function') return null;
      const persistencePresentationUrl = typeof resolvedOptions.presentationUrl === 'string'
        && resolvedOptions.presentationUrl
        ? resolvedOptions.presentationUrl
        : getPresentationUrl();
      return createSessionReaderOptions({
        setPersistedHtml(nextHtml) {
          if (typeof applyPersistedDeckState === 'function') {
            applyPersistedDeckState({ cleanHtml: nextHtml });
          }
        },
        setPersistedCanonicalDeck(nextCanonicalDeck) {
          if (typeof applyPersistedDeckState === 'function') {
            applyPersistedDeckState(
              { canonicalDeck: nextCanonicalDeck },
              { presentationUrl: persistencePresentationUrl }
            );
          }
        },
        setPersistedPlaybackState(nextPlaybackState) {
          if (typeof applyPersistedDeckState === 'function') {
            applyPersistedDeckState({ playbackState: nextPlaybackState });
          }
        },
        onSuccess: resolvedOptions.onSuccess,
        onFailure: resolvedOptions.onFailure
      });
    }

    return createCurrentStudioPersistenceHandlerOptions;
  }

  function createStudioEditorPersistenceHandlerOptionsGlobalApi(options = {}) {
    const createCurrentStudioPersistenceHandlerOptions =
      typeof options.createCurrentStudioPersistenceHandlerOptions === 'function'
        ? options.createCurrentStudioPersistenceHandlerOptions
        : null;
    return {
      createCurrentStudioPersistenceHandlerOptions: (...args) =>
        createCurrentStudioPersistenceHandlerOptions
          ? createCurrentStudioPersistenceHandlerOptions(...args)
          : null
    };
  }

  return {
    createStudioEditorPersistenceHandlerOptionsAction,
    createStudioEditorPersistenceHandlerOptionsGlobalApi
  };
}));
