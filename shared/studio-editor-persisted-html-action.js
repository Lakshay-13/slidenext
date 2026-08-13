(function initStudioEditorPersistedHtmlAction(root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
    return;
  }
  root.SlideNextStudioEditorPersistedHtmlAction = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function createApi() {
  function createStudioEditorPersistedHtmlAction(options = {}) {
    const getPersistenceController = typeof options.getPersistenceController === 'function'
      ? options.getPersistenceController
      : () => options.persistenceController || null;
    const persistenceStateApi = options.persistenceStateApi || null;
    const persistenceApi = options.persistenceApi || null;
    let persistedHtmlAdapter = null;

    function getPersistenceFunction(name, nextOptions = {}) {
      if (typeof nextOptions[name] === 'function') return nextOptions[name];
      return persistenceApi && typeof persistenceApi[name] === 'function'
        ? persistenceApi[name]
        : null;
    }

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

    function resolveEditorReusablePersistedHtml(persistedDeckState, nextOptions = {}) {
      const persistenceController = getPersistenceController();
      if (persistenceController
        && typeof persistenceController.resolveReusablePersistedHtml === 'function') {
        const result = persistenceController.resolveReusablePersistedHtml(
          persistedDeckState,
          nextOptions
        );
        if (result !== null && typeof result !== 'undefined') return result;
      }

      const createPersistedHtmlAdapter = persistenceStateApi
        && typeof persistenceStateApi.createStudioEditorReusablePersistedHtmlAdapter === 'function'
        ? persistenceStateApi.createStudioEditorReusablePersistedHtmlAdapter
        : null;
      if (createPersistedHtmlAdapter) {
        if (typeof persistedHtmlAdapter !== 'function') {
          persistedHtmlAdapter = createPersistedHtmlAdapter({ persistenceApi });
        }
        return typeof persistedHtmlAdapter === 'function'
          ? persistedHtmlAdapter(persistedDeckState, nextOptions)
          : '';
      }

      const resolveReusablePersistedHtml = getPersistenceFunction(
        'resolveStudioReusablePersistedHtml',
        nextOptions
      );
      const resolvePersistedHtmlReuse = getPersistenceFunction(
        'resolveStudioPersistedHtmlReuse',
        nextOptions
      );
      const isPersistedCanonicalDeck = getPersistenceFunction(
        'isStudioPersistedCanonicalDeck',
        nextOptions
      );
      const createPersistedHtmlResolver = persistenceApi
        && typeof persistenceApi.createStudioReusablePersistedHtmlResolver === 'function'
        ? persistenceApi.createStudioReusablePersistedHtmlResolver
        : null;
      if (createPersistedHtmlResolver) {
        return createPersistedHtmlResolver({
          resolveReusablePersistedHtml,
          resolvePersistedHtmlReuse,
          isPersistedCanonicalDeck
        })(persistedDeckState, buildResolverOptions(nextOptions));
      }
      if (!resolveReusablePersistedHtml) return '';
      return resolveReusablePersistedHtml(
        persistedDeckState,
        {
          ...buildResolverOptions(nextOptions),
          resolvePersistedHtmlReuse,
          isPersistedCanonicalDeck
        }
      );
    }

    return resolveEditorReusablePersistedHtml;
  }

  function createStudioEditorPersistedHtmlGlobalApi(options = {}) {
    const resolveEditorReusablePersistedHtml = typeof options.resolveEditorReusablePersistedHtml === 'function'
      ? options.resolveEditorReusablePersistedHtml
      : null;
    return {
      resolveEditorReusablePersistedHtml: (...args) => resolveEditorReusablePersistedHtml
        ? resolveEditorReusablePersistedHtml(...args)
        : ''
    };
  }

  return {
    createStudioEditorPersistedHtmlAction,
    createStudioEditorPersistedHtmlGlobalApi
  };
}));
