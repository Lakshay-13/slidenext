(function initStudioEditorCapturedPersistableDeckStateAction(root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
    return;
  }
  root.SlideNextStudioEditorCapturedPersistableDeckStateAction = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function createApi() {
  function createStudioEditorCapturedPersistableDeckStateAction(options = {}) {
    const getPersistenceController = typeof options.getPersistenceController === 'function'
      ? options.getPersistenceController
      : () => options.persistenceController || null;
    const persistenceStateApi = options.persistenceStateApi || null;
    const persistenceApi = options.persistenceApi || null;
    let capturedStateAdapter = null;

    function resolveEditorCapturedPersistableDeckState(cleanHtml = '', nextOptions = {}) {
      const nextCleanHtml = typeof cleanHtml === 'string'
        ? cleanHtml
        : '';
      const persistenceController = getPersistenceController();
      if (persistenceController
        && typeof persistenceController.resolveCapturedPersistableDeckState === 'function') {
        const resolvedState = persistenceController.resolveCapturedPersistableDeckState(
          nextCleanHtml,
          nextOptions
        );
        if (resolvedState !== null && typeof resolvedState !== 'undefined') {
          return resolvedState;
        }
      }

      const createCapturedStateAdapter = persistenceStateApi
        && typeof persistenceStateApi.createStudioEditorCapturedPersistableDeckStateResolverAdapter === 'function'
        ? persistenceStateApi.createStudioEditorCapturedPersistableDeckStateResolverAdapter
        : null;
      if (createCapturedStateAdapter) {
        if (typeof capturedStateAdapter !== 'function') {
          capturedStateAdapter = createCapturedStateAdapter({
            persistenceApi
          });
        }
        const resolvedState = typeof capturedStateAdapter === 'function'
          ? capturedStateAdapter(nextCleanHtml, nextOptions)
          : null;
        if (resolvedState !== null && typeof resolvedState !== 'undefined') {
          return resolvedState;
        }
      }

      const createStudioCapturedPersistableDeckStateResolver = persistenceApi
        && typeof persistenceApi.createStudioCapturedPersistableDeckStateResolver === 'function'
        ? persistenceApi.createStudioCapturedPersistableDeckStateResolver
        : null;
      if (createStudioCapturedPersistableDeckStateResolver) {
        return createStudioCapturedPersistableDeckStateResolver({
          buildCanonicalDeck: typeof nextOptions.buildCanonicalDeck === 'function'
            ? nextOptions.buildCanonicalDeck
            : () => null,
          resolvePlaybackState: typeof nextOptions.resolvePlaybackState === 'function'
            ? nextOptions.resolvePlaybackState
            : () => null,
          resolveCapturedPersistableDeckState:
            typeof nextOptions.resolveStudioCapturedPersistableDeckState === 'function'
              ? nextOptions.resolveStudioCapturedPersistableDeckState
              : persistenceApi
                && typeof persistenceApi.resolveStudioCapturedPersistableDeckState === 'function'
                ? persistenceApi.resolveStudioCapturedPersistableDeckState
                : null
        })(nextCleanHtml, nextOptions);
      }

      const resolveStudioCapturedPersistableDeckState =
        typeof nextOptions.resolveStudioCapturedPersistableDeckState === 'function'
          ? nextOptions.resolveStudioCapturedPersistableDeckState
          : persistenceApi
            && typeof persistenceApi.resolveStudioCapturedPersistableDeckState === 'function'
            ? persistenceApi.resolveStudioCapturedPersistableDeckState
            : null;
      if (!resolveStudioCapturedPersistableDeckState) return null;

      return resolveStudioCapturedPersistableDeckState(nextCleanHtml, {
        canonicalDeck: Object.prototype.hasOwnProperty.call(nextOptions, 'canonicalDeck')
          ? nextOptions.canonicalDeck
          : null,
        playbackState: Object.prototype.hasOwnProperty.call(nextOptions, 'playbackState')
          ? nextOptions.playbackState
          : undefined,
        buildCanonicalDeck: typeof nextOptions.buildCanonicalDeck === 'function'
          ? nextOptions.buildCanonicalDeck
          : () => null,
        resolvePlaybackState: typeof nextOptions.resolvePlaybackState === 'function'
          ? nextOptions.resolvePlaybackState
          : () => null
      });
    }

    return resolveEditorCapturedPersistableDeckState;
  }

  function createStudioEditorCapturedPersistableDeckStateGlobalApi(options = {}) {
    const resolveEditorCapturedPersistableDeckState =
      typeof options.resolveEditorCapturedPersistableDeckState === 'function'
        ? options.resolveEditorCapturedPersistableDeckState
        : null;
    return {
      resolveEditorCapturedPersistableDeckState: (...args) => resolveEditorCapturedPersistableDeckState
        ? resolveEditorCapturedPersistableDeckState(...args)
        : null
    };
  }

  return {
    createStudioEditorCapturedPersistableDeckStateAction,
    createStudioEditorCapturedPersistableDeckStateGlobalApi
  };
}));
