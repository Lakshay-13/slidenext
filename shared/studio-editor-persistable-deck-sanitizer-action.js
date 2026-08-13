(function initStudioEditorPersistableDeckSanitizerAction(root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
    return;
  }
  root.SlideNextStudioEditorPersistableDeckSanitizerAction = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function createApi() {
  function createStudioEditorPersistableDeckSanitizerAction(options = {}) {
    const getPersistenceController = typeof options.getPersistenceController === 'function'
      ? options.getPersistenceController
      : () => options.persistenceController || null;
    const persistenceStateApi = options.persistenceStateApi || null;
    const persistenceApi = options.persistenceApi || null;
    const getDeckSanitizerOptions = typeof options.getDeckSanitizerOptions === 'function'
      ? options.getDeckSanitizerOptions
      : () => ({});
    let sanitizerOptionsAdapter = null;

    function resolveSanitizerCallbacks(nextOptions = {}) {
      return {
        resolveMetadataPersistenceOptions:
          typeof nextOptions.resolveMetadataPersistenceOptions === 'function'
            ? nextOptions.resolveMetadataPersistenceOptions
            : () => ({}),
        getDeckSanitizerOptions: typeof nextOptions.getDeckSanitizerOptions === 'function'
          ? nextOptions.getDeckSanitizerOptions
          : getDeckSanitizerOptions
      };
    }

    function buildEditorPersistableDeckSanitizerOptions(playbackState = null, nextOptions = {}) {
      const sanitizerCallbacks = resolveSanitizerCallbacks(nextOptions);
      const persistenceController = getPersistenceController();
      if (persistenceController
        && typeof persistenceController.buildPersistableDeckSanitizerOptions === 'function') {
        const sanitizerOptions = persistenceController.buildPersistableDeckSanitizerOptions(
          playbackState,
          {
            ...nextOptions,
            ...sanitizerCallbacks
          }
        );
        if (sanitizerOptions !== null && typeof sanitizerOptions !== 'undefined') {
          return sanitizerOptions;
        }
      }

      const createSanitizerAdapter = persistenceStateApi
        && typeof persistenceStateApi.createStudioEditorPersistableDeckSanitizerOptionsAdapter === 'function'
        ? persistenceStateApi.createStudioEditorPersistableDeckSanitizerOptionsAdapter
        : null;
      if (createSanitizerAdapter) {
        if (typeof sanitizerOptionsAdapter !== 'function') {
          sanitizerOptionsAdapter = createSanitizerAdapter({
            persistenceApi,
            ...sanitizerCallbacks
          });
        }
        return typeof sanitizerOptionsAdapter === 'function'
          ? sanitizerOptionsAdapter(playbackState, nextOptions)
          : {};
      }

      const createSanitizerBuilder = persistenceApi
        && typeof persistenceApi.createStudioPersistableDeckSanitizerOptionsBuilder === 'function'
        ? persistenceApi.createStudioPersistableDeckSanitizerOptionsBuilder
        : null;
      if (createSanitizerBuilder) {
        return createSanitizerBuilder(sanitizerCallbacks)(playbackState, nextOptions);
      }

      const buildSanitizerOptions = persistenceApi
        && typeof persistenceApi.buildStudioPersistableDeckSanitizerOptions === 'function'
        ? persistenceApi.buildStudioPersistableDeckSanitizerOptions
        : null;
      return buildSanitizerOptions
        ? buildSanitizerOptions(playbackState, sanitizerCallbacks)
        : {};
    }

    return buildEditorPersistableDeckSanitizerOptions;
  }

  function createStudioEditorPersistableDeckSanitizerGlobalApi(options = {}) {
    const buildEditorPersistableDeckSanitizerOptions =
      typeof options.buildEditorPersistableDeckSanitizerOptions === 'function'
        ? options.buildEditorPersistableDeckSanitizerOptions
        : null;
    return {
      buildEditorPersistableDeckSanitizerOptions: (...args) => buildEditorPersistableDeckSanitizerOptions
        ? buildEditorPersistableDeckSanitizerOptions(...args)
        : {}
    };
  }

  return {
    createStudioEditorPersistableDeckSanitizerAction,
    createStudioEditorPersistableDeckSanitizerGlobalApi
  };
}));
