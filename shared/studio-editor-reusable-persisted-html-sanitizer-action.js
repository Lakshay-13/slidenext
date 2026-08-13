(function initStudioEditorReusablePersistedHtmlSanitizerAction(root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
    return;
  }
  root.SlideNextStudioEditorReusablePersistedHtmlSanitizerAction = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function createApi() {
  function createStudioEditorReusablePersistedHtmlSanitizerAction(options = {}) {
    const getPersistenceController = typeof options.getPersistenceController === 'function'
      ? options.getPersistenceController
      : () => options.persistenceController || null;
    const persistenceStateApi = options.persistenceStateApi || null;
    const persistenceApi = options.persistenceApi || null;
    const deckPersistenceApi = options.deckPersistenceApi || null;
    const defaultBuildPersistableDeckHtml = typeof options.buildPersistableDeckHtml === 'function'
      ? options.buildPersistableDeckHtml
      : deckPersistenceApi
        && typeof deckPersistenceApi.buildPersistableDeckHtml === 'function'
        ? deckPersistenceApi.buildPersistableDeckHtml
        : null;
    const defaultBuildPersistableDeckSanitizerOptions =
      typeof options.buildEditorPersistableDeckSanitizerOptions === 'function'
        ? options.buildEditorPersistableDeckSanitizerOptions
        : null;
    const getBuildPersistableDeckSanitizerOptions =
      typeof options.getBuildEditorPersistableDeckSanitizerOptions === 'function'
        ? options.getBuildEditorPersistableDeckSanitizerOptions
        : () => defaultBuildPersistableDeckSanitizerOptions;
    const defaultGetDeckSanitizerOptions = typeof options.getDeckSanitizerOptions === 'function'
      ? options.getDeckSanitizerOptions
      : () => ({});
    const defaultDOMParser = typeof options.DOMParser === 'function'
      ? options.DOMParser
      : null;
    let persistedHtmlSanitizerAdapter = null;

    function resolveSanitizerCallbacks(nextOptions = {}) {
      return {
        buildPersistableDeckHtml: typeof nextOptions.buildPersistableDeckHtml === 'function'
          ? nextOptions.buildPersistableDeckHtml
          : defaultBuildPersistableDeckHtml,
        resolveMetadataPersistenceOptions:
          typeof nextOptions.resolveMetadataPersistenceOptions === 'function'
            ? nextOptions.resolveMetadataPersistenceOptions
            : () => ({}),
        getDeckSanitizerOptions: typeof nextOptions.getDeckSanitizerOptions === 'function'
          ? nextOptions.getDeckSanitizerOptions
          : defaultGetDeckSanitizerOptions,
        DOMParser: typeof nextOptions.DOMParser === 'function'
          ? nextOptions.DOMParser
          : defaultDOMParser
      };
    }

    function sanitizeEditorReusablePersistedHtml(persistedHtml, nextOptions = {}) {
      const nextPersistedHtml = typeof persistedHtml === 'string'
        ? persistedHtml
        : '';
      const sanitizerCallbacks = resolveSanitizerCallbacks(nextOptions);
      const persistenceController = getPersistenceController();
      if (persistenceController
        && typeof persistenceController.sanitizeReusablePersistedHtml === 'function') {
        const sanitizedHtml = persistenceController.sanitizeReusablePersistedHtml(nextPersistedHtml, {
          ...nextOptions,
          ...sanitizerCallbacks
        });
        if (sanitizedHtml !== null && typeof sanitizedHtml !== 'undefined') {
          return sanitizedHtml;
        }
      }

      const createSanitizerAdapter = persistenceStateApi
        && typeof persistenceStateApi.createStudioEditorReusablePersistedHtmlSanitizerAdapter === 'function'
        ? persistenceStateApi.createStudioEditorReusablePersistedHtmlSanitizerAdapter
        : null;
      if (createSanitizerAdapter) {
        if (typeof persistedHtmlSanitizerAdapter !== 'function') {
          persistedHtmlSanitizerAdapter = createSanitizerAdapter({
            persistenceApi,
            ...sanitizerCallbacks
          });
        }
        return typeof persistedHtmlSanitizerAdapter === 'function'
          ? persistedHtmlSanitizerAdapter(nextPersistedHtml, nextOptions)
          : nextPersistedHtml;
      }

      const sanitizeStudioReusablePersistedHtml = persistenceApi
        && typeof persistenceApi.sanitizeStudioReusablePersistedHtml === 'function'
        ? persistenceApi.sanitizeStudioReusablePersistedHtml
        : null;
      if (sanitizeStudioReusablePersistedHtml) {
        return sanitizeStudioReusablePersistedHtml(nextPersistedHtml, {
          playbackState: Object.prototype.hasOwnProperty.call(nextOptions, 'playbackState')
            ? nextOptions.playbackState
            : null,
          resolveMetadataPersistenceOptions: sanitizerCallbacks.resolveMetadataPersistenceOptions,
          getDeckSanitizerOptions: sanitizerCallbacks.getDeckSanitizerOptions,
          buildPersistableDeckHtml: sanitizerCallbacks.buildPersistableDeckHtml,
          DOMParser: sanitizerCallbacks.DOMParser
        });
      }

      if (!nextPersistedHtml
        || typeof sanitizerCallbacks.DOMParser !== 'function'
        || !sanitizerCallbacks.buildPersistableDeckHtml) {
        return nextPersistedHtml;
      }

      try {
        const parsedDoc = new sanitizerCallbacks.DOMParser().parseFromString(
          nextPersistedHtml,
          'text/html'
        );
        if (!parsedDoc || !parsedDoc.documentElement) {
          return nextPersistedHtml;
        }
        const buildPersistableDeckSanitizerOptions =
          typeof nextOptions.buildPersistableDeckSanitizerOptions === 'function'
            ? nextOptions.buildPersistableDeckSanitizerOptions
            : getBuildPersistableDeckSanitizerOptions();
        if (typeof buildPersistableDeckSanitizerOptions !== 'function') {
          return nextPersistedHtml;
        }
        const persistableDeckSanitizerOptions = buildPersistableDeckSanitizerOptions(
          Object.prototype.hasOwnProperty.call(nextOptions, 'playbackState')
            ? nextOptions.playbackState
            : null,
          {
            resolveMetadataPersistenceOptions: sanitizerCallbacks.resolveMetadataPersistenceOptions,
            getDeckSanitizerOptions: typeof nextOptions.getDeckSanitizerOptions === 'function'
              ? nextOptions.getDeckSanitizerOptions
              : undefined
          }
        );
        return sanitizerCallbacks.buildPersistableDeckHtml(parsedDoc, {
          ...persistableDeckSanitizerOptions
        });
      } catch (err) {
        return nextPersistedHtml;
      }
    }

    return sanitizeEditorReusablePersistedHtml;
  }

  function createStudioEditorReusablePersistedHtmlSanitizerGlobalApi(options = {}) {
    const sanitizeEditorReusablePersistedHtml =
      typeof options.sanitizeEditorReusablePersistedHtml === 'function'
        ? options.sanitizeEditorReusablePersistedHtml
        : null;
    return {
      sanitizeEditorReusablePersistedHtml: (...args) => sanitizeEditorReusablePersistedHtml
        ? sanitizeEditorReusablePersistedHtml(...args)
        : typeof args[0] === 'string'
          ? args[0]
          : ''
    };
  }

  return {
    createStudioEditorReusablePersistedHtmlSanitizerAction,
    createStudioEditorReusablePersistedHtmlSanitizerGlobalApi
  };
}));
