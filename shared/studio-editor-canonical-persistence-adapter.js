(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorCanonicalPersistenceAdapter = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function createStudioEditorCanonicalPersistenceAdapter(options = {}) {
    const getPersistenceController = typeof options.getPersistenceController === 'function'
      ? options.getPersistenceController
      : () => options.persistenceController || null;
    const persistenceApi = options.persistenceApi && typeof options.persistenceApi === 'object'
      ? options.persistenceApi
      : null;
    const persistenceStateApi = options.persistenceStateApi
      && typeof options.persistenceStateApi === 'object'
      ? options.persistenceStateApi
      : null;
    const isCanonicalDeck = Object.prototype.hasOwnProperty.call(options, 'isCanonicalDeck')
      ? options.isCanonicalDeck
      : null;
    const buildCanonicalDeckForDocument = typeof options.buildCanonicalDeckForDocument === 'function'
      ? options.buildCanonicalDeckForDocument
      : null;
    const getPendingCanonicalDeck = typeof options.getPendingCanonicalDeck === 'function'
      ? options.getPendingCanonicalDeck
      : null;
    const resolveCanonicalDeckOverrideForFallback =
      typeof options.resolveCanonicalDeckOverrideForFallback === 'function'
        ? options.resolveCanonicalDeckOverrideForFallback
        : null;
    let canonicalDeckOverrideAdapter = null;
    let fallbackCanonicalDeckAdapter = null;

    function resolveCanonicalDeckOverride(canonicalDeck = null, nextOptions = {}) {
      if (!canonicalDeck && getPendingCanonicalDeck) {
        try {
          const pendingCanonicalDeck = getPendingCanonicalDeck(
            nextOptions && typeof nextOptions === 'object'
              ? nextOptions.sourceDocument || nextOptions.documentRef || null
              : null
          );
          const isValidPendingDeck = typeof isCanonicalDeck === 'function'
            ? isCanonicalDeck(pendingCanonicalDeck)
            : !!(pendingCanonicalDeck && Array.isArray(pendingCanonicalDeck.slides));
          if (isValidPendingDeck) return pendingCanonicalDeck;
        } catch (error) {
          // Continue through the normal persistence override chain.
        }
      }
      const persistenceController = getPersistenceController();
      if (persistenceController
        && typeof persistenceController.resolveCanonicalDeckOverride === 'function') {
        const resolvedCanonicalDeck = persistenceController.resolveCanonicalDeckOverride(
          canonicalDeck,
          nextOptions
        );
        if (resolvedCanonicalDeck !== null && typeof resolvedCanonicalDeck !== 'undefined') {
          return resolvedCanonicalDeck;
        }
      }

      const createCanonicalDeckOverrideAdapter = persistenceStateApi
        && typeof persistenceStateApi.createStudioEditorCanonicalDeckOverrideAdapter === 'function'
        ? persistenceStateApi.createStudioEditorCanonicalDeckOverrideAdapter
        : null;
      if (createCanonicalDeckOverrideAdapter) {
        if (typeof canonicalDeckOverrideAdapter !== 'function') {
          canonicalDeckOverrideAdapter = createCanonicalDeckOverrideAdapter({
            persistenceApi,
            isCanonicalDeck
          });
        }
        return typeof canonicalDeckOverrideAdapter === 'function'
          ? canonicalDeckOverrideAdapter(canonicalDeck, nextOptions)
          : null;
      }

      const buildCanonicalDeck = nextOptions && typeof nextOptions.buildCanonicalDeck === 'function'
        ? nextOptions.buildCanonicalDeck
        : null;
      if (!persistenceApi
        || typeof persistenceApi.resolveStudioCanonicalDeckOverride !== 'function') {
        return null;
      }
      return persistenceApi.resolveStudioCanonicalDeckOverride({
        canonicalDeck,
        buildCanonicalDeck,
        isCanonicalDeck
      });
    }

    function resolveFallbackCanonicalDeck(doc = null, canonicalDeck = null) {
      const buildCanonicalDeck = canonicalDeck && buildCanonicalDeckForDocument
        ? () => buildCanonicalDeckForDocument(doc)
        : null;
      const persistenceController = getPersistenceController();
      if (persistenceController
        && typeof persistenceController.resolveFallbackCanonicalDeck === 'function') {
        const resolvedCanonicalDeck = persistenceController.resolveFallbackCanonicalDeck(
          canonicalDeck,
          { buildCanonicalDeck }
        );
        if (resolvedCanonicalDeck !== null && typeof resolvedCanonicalDeck !== 'undefined') {
          return resolvedCanonicalDeck;
        }
      }

      const createFallbackCanonicalDeckAdapter = persistenceStateApi
        && typeof persistenceStateApi.createStudioEditorFallbackCanonicalDeckAdapter === 'function'
        ? persistenceStateApi.createStudioEditorFallbackCanonicalDeckAdapter
        : null;
      if (createFallbackCanonicalDeckAdapter) {
        if (typeof fallbackCanonicalDeckAdapter !== 'function') {
          fallbackCanonicalDeckAdapter = createFallbackCanonicalDeckAdapter({
            persistenceApi,
            resolveCanonicalDeckOverride: resolveCanonicalDeckOverrideForFallback
              || resolveCanonicalDeckOverride,
            isCanonicalDeck
          });
        }
        return typeof fallbackCanonicalDeckAdapter === 'function'
          ? fallbackCanonicalDeckAdapter(canonicalDeck, { buildCanonicalDeck })
          : null;
      }

      const createFallbackCanonicalDeckResolver = persistenceApi
        && typeof persistenceApi.createStudioFallbackCanonicalDeckResolver === 'function'
        ? persistenceApi.createStudioFallbackCanonicalDeckResolver
        : null;
      if (!createFallbackCanonicalDeckResolver) return null;
      const resolver = createFallbackCanonicalDeckResolver({
        buildCanonicalDeck,
        resolveCanonicalDeckOverride: resolveCanonicalDeckOverrideForFallback
          || resolveCanonicalDeckOverride,
        isCanonicalDeck
      });
      return typeof resolver === 'function' ? resolver(canonicalDeck) : null;
    }

    return {
      resolveCanonicalDeckOverride,
      resolveFallbackCanonicalDeck
    };
  }

  return {
    createStudioEditorCanonicalPersistenceAdapter
  };
});
