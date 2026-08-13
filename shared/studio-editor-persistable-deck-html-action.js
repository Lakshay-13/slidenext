(function initStudioEditorPersistableDeckHtmlAction(root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
    return;
  }
  root.SlideNextStudioEditorPersistableDeckHtmlAction = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function createApi() {
  function createStudioEditorPersistableDeckHtmlAction(options = {}) {
    const getDocument = typeof options.getDocument === 'function'
      ? options.getDocument
      : () => null;
    const getPersistenceController = typeof options.getPersistenceController === 'function'
      ? options.getPersistenceController
      : () => options.persistenceController || null;
    const persistenceApi = options.persistenceApi || null;
    const deckPersistenceApi = options.deckPersistenceApi || null;
    const getCurrentPersistedDeckState = typeof options.getCurrentPersistedDeckState === 'function'
      ? options.getCurrentPersistedDeckState
      : () => null;
    const getPersistedDeckStateWithContent =
      typeof options.getPersistedDeckStateWithContent === 'function'
        ? options.getPersistedDeckStateWithContent
        : () => null;
    const getResolveCanonicalDeckOverride =
      typeof options.getResolveCanonicalDeckOverride === 'function'
        ? options.getResolveCanonicalDeckOverride
        : () => null;
    const getBuildCanonicalDeck = typeof options.getBuildCanonicalDeck === 'function'
      ? options.getBuildCanonicalDeck
      : () => null;
    const getResolveReusablePersistedHtml =
      typeof options.getResolveReusablePersistedHtml === 'function'
        ? options.getResolveReusablePersistedHtml
        : () => null;
    const getSanitizeReusablePersistedHtml =
      typeof options.getSanitizeReusablePersistedHtml === 'function'
        ? options.getSanitizeReusablePersistedHtml
        : () => null;
    const getCreateDeckViewBuildOptions =
      typeof options.getCreateDeckViewBuildOptions === 'function'
        ? options.getCreateDeckViewBuildOptions
        : () => null;
    const getBuildDeckRenderOptions = typeof options.getBuildDeckRenderOptions === 'function'
      ? options.getBuildDeckRenderOptions
      : () => null;
    const getBuildSourceDeckHtml = typeof options.getBuildSourceDeckHtml === 'function'
      ? options.getBuildSourceDeckHtml
      : () => null;
    const getCapturePlaybackState = typeof options.getCapturePlaybackState === 'function'
      ? options.getCapturePlaybackState
      : () => null;
    const getBuildSanitizerOptions = typeof options.getBuildSanitizerOptions === 'function'
      ? options.getBuildSanitizerOptions
      : () => null;
    const getResolveMetadataPersistenceOptions =
      typeof options.getResolveMetadataPersistenceOptions === 'function'
        ? options.getResolveMetadataPersistenceOptions
        : () => null;

    function getFunction(api, name) {
      return api && typeof api[name] === 'function' ? api[name] : null;
    }

    function resolveDependency(getter) {
      const dependency = typeof getter === 'function' ? getter() : null;
      return typeof dependency === 'function' ? dependency : null;
    }

    function resolveCanonicalDeck(providedCanonicalDeck, doc, allowBuild = true) {
      const resolveOverride = resolveDependency(getResolveCanonicalDeckOverride);
      const buildCanonicalDeck = resolveDependency(getBuildCanonicalDeck);
      if (typeof resolveOverride === 'function') {
        const resolvedCanonicalDeck = resolveOverride(providedCanonicalDeck, {
          sourceDocument: doc,
          buildCanonicalDeck: () => allowBuild && buildCanonicalDeck
            ? buildCanonicalDeck(doc)
            : null
        });
        if (resolvedCanonicalDeck !== null && typeof resolvedCanonicalDeck !== 'undefined') {
          return resolvedCanonicalDeck;
        }
      }
      return providedCanonicalDeck
        || (allowBuild && buildCanonicalDeck
          ? buildCanonicalDeck(doc)
          : null);
    }

    function buildPersistableDeckHtml(doc = getDocument()) {
      const buildOptions = arguments.length > 1
        && arguments[1]
        && typeof arguments[1] === 'object'
        ? arguments[1]
        : {};
      const providedCanonicalDeck = Object.prototype.hasOwnProperty.call(buildOptions, 'canonicalDeck')
        ? buildOptions.canonicalDeck
        : null;
      const buildWithoutDocument = getFunction(
        persistenceApi,
        'buildStudioPersistableDeckHtmlWithoutDocument'
      );
      const buildFromDocument = getFunction(
        persistenceApi,
        'buildStudioPersistableDeckHtmlFromDocument'
      );
      const sharedBuildPersistableDeckHtml = getFunction(
        deckPersistenceApi,
        'buildPersistableDeckHtml'
      );
      const resolveMetadataPersistenceOptions = resolveDependency(
        getResolveMetadataPersistenceOptions
      );
      const buildSanitizerOptions = resolveDependency(getBuildSanitizerOptions);
      const sharedBuildWithoutDocumentOptions = {
        getPersistedDeckState: (...args) => {
          const getPersistedDeckState = resolveDependency(getCurrentPersistedDeckState);
          return getPersistedDeckState ? getPersistedDeckState(...args) : null;
        },
        resolvePersistedDeckStateWithContent: (...args) => {
          const resolvePersistedDeckStateWithContent = resolveDependency(
            getPersistedDeckStateWithContent
          );
          return resolvePersistedDeckStateWithContent
            ? resolvePersistedDeckStateWithContent(...args)
            : null;
        },
        resolveCanonicalDeck: () => resolveCanonicalDeck(providedCanonicalDeck, doc),
        onCanonicalDeckResolved: typeof buildOptions.onCanonicalDeckResolved === 'function'
          ? buildOptions.onCanonicalDeckResolved
          : null,
        onPlaybackStateResolved: typeof buildOptions.onPlaybackStateResolved === 'function'
          ? buildOptions.onPlaybackStateResolved
          : null,
        resolveReusablePersistedHtml: (...args) => {
          const resolveReusablePersistedHtml = resolveDependency(
            getResolveReusablePersistedHtml
          );
          return resolveReusablePersistedHtml
            ? resolveReusablePersistedHtml(...args)
            : '';
        },
        sanitizeReusablePersistedHtml: (persistedHtml, sanitizeOptions = {}) => {
          const sanitizeReusablePersistedHtml = resolveDependency(
            getSanitizeReusablePersistedHtml
          );
          return sanitizeReusablePersistedHtml
            ? sanitizeReusablePersistedHtml(persistedHtml, {
                playbackState: Object.prototype.hasOwnProperty.call(sanitizeOptions, 'playbackState')
                  ? sanitizeOptions.playbackState
                  : null,
                resolveMetadataPersistenceOptions
              })
            : persistedHtml;
        },
        buildSourceDeckHtml: ({ canonicalDeck, persistedHtml }) => {
          const createDeckViewBuildOptions = resolveDependency(getCreateDeckViewBuildOptions);
          const buildDeckRenderOptions = resolveDependency(getBuildDeckRenderOptions);
          const buildSourceDeckHtml = resolveDependency(getBuildSourceDeckHtml);
          if (!createDeckViewBuildOptions || !buildDeckRenderOptions || !buildSourceDeckHtml) {
            return persistedHtml || '';
          }
          const sourceViewOptions = createDeckViewBuildOptions(doc, {
            buildCanonicalDeck: () => canonicalDeck,
            buildFallbackHtml: () => persistedHtml,
            buildRenderOptions: (sourceDoc, nextCanonicalDeck, renderOptions = {}) =>
              buildDeckRenderOptions(sourceDoc, nextCanonicalDeck, renderOptions)
          });
          return buildSourceDeckHtml(doc, {
            buildViewOptions: () => sourceViewOptions
          });
        }
      };
      const sharedBuildFromDocumentOptions = {
        resolveCanonicalDeck: () => resolveCanonicalDeck(providedCanonicalDeck, doc),
        resolvePlaybackState: (canonicalDeck) => {
          const capturePlaybackState = resolveDependency(getCapturePlaybackState);
          return capturePlaybackState ? capturePlaybackState(doc, canonicalDeck) : null;
        },
        onCanonicalDeckResolved: typeof buildOptions.onCanonicalDeckResolved === 'function'
          ? buildOptions.onCanonicalDeckResolved
          : null,
        onPlaybackStateResolved: typeof buildOptions.onPlaybackStateResolved === 'function'
          ? buildOptions.onPlaybackStateResolved
          : null,
        buildPersistableDeckSanitizerOptions: (playbackState) => buildSanitizerOptions
          ? buildSanitizerOptions(playbackState, { resolveMetadataPersistenceOptions })
          : {},
        buildPersistableDeckHtml: sharedBuildPersistableDeckHtml
      };
      if (!doc) {
        const persistenceController = typeof getPersistenceController === 'function'
          ? getPersistenceController()
          : null;
        if (persistenceController
          && typeof persistenceController.buildPersistableDeckHtml === 'function') {
          const sharedResult = persistenceController.buildPersistableDeckHtml(
            doc,
            sharedBuildWithoutDocumentOptions
          );
          if (sharedResult !== null && typeof sharedResult !== 'undefined') {
            return sharedResult;
          }
        }
        if (buildWithoutDocument) {
          return buildWithoutDocument(sharedBuildWithoutDocumentOptions);
        }

        const getPersistedDeckState = resolveDependency(getCurrentPersistedDeckState);
        const resolvePersistedDeckStateWithContent = resolveDependency(
          getPersistedDeckStateWithContent
        );
        const persistedDeckState = getPersistedDeckState
          ? getPersistedDeckState()
          : {};
        const persistedDeckStateWithContent = resolvePersistedDeckStateWithContent
          ? resolvePersistedDeckStateWithContent(persistedDeckState)
          : null;
        const persistedHtml = persistedDeckStateWithContent
          ? persistedDeckStateWithContent.cleanHtml
          : '';
        const canonicalDeck = resolveCanonicalDeck(providedCanonicalDeck, doc);
        if (typeof buildOptions.onCanonicalDeckResolved === 'function') {
          buildOptions.onCanonicalDeckResolved(canonicalDeck);
        }
        if (typeof buildOptions.onPlaybackStateResolved === 'function') {
          buildOptions.onPlaybackStateResolved(persistedDeckState.playbackState);
        }
        const resolveReusablePersistedHtml = resolveDependency(
          getResolveReusablePersistedHtml
        );
        const reusablePersistedHtml = resolveReusablePersistedHtml
          ? resolveReusablePersistedHtml(
              persistedDeckStateWithContent || persistedDeckState,
              {
                canonicalDeck,
                persistedHtml,
                persistedCanonicalDeck: persistedDeckState.canonicalDeck
              }
            )
          : '';
        if (reusablePersistedHtml) {
          const sanitizeReusablePersistedHtml = resolveDependency(
            getSanitizeReusablePersistedHtml
          );
          return sanitizeReusablePersistedHtml
            ? sanitizeReusablePersistedHtml(reusablePersistedHtml, {
                playbackState: persistedDeckState.playbackState,
                resolveMetadataPersistenceOptions
              })
            : reusablePersistedHtml;
        }
        return sharedBuildWithoutDocumentOptions.buildSourceDeckHtml({
          canonicalDeck,
          persistedHtml
        });
      }
      if (buildFromDocument) {
        const persistenceController = typeof getPersistenceController === 'function'
          ? getPersistenceController()
          : null;
        if (persistenceController
          && typeof persistenceController.buildPersistableDeckHtml === 'function') {
          const sharedResult = persistenceController.buildPersistableDeckHtml(
            doc,
            sharedBuildFromDocumentOptions
          );
          if (sharedResult !== null && typeof sharedResult !== 'undefined') {
            return sharedResult;
          }
        }
        return buildFromDocument(doc, sharedBuildFromDocumentOptions);
      }

      const buildCanonicalDeck = resolveDependency(getBuildCanonicalDeck);
      const canonicalDeck = resolveCanonicalDeck(providedCanonicalDeck, doc, false)
        || (buildCanonicalDeck ? buildCanonicalDeck(doc) : null);
      const capturePlaybackState = resolveDependency(getCapturePlaybackState);
      const resolvedPlaybackState = capturePlaybackState
        ? capturePlaybackState(doc, canonicalDeck)
        : null;
      if (typeof buildOptions.onCanonicalDeckResolved === 'function') {
        buildOptions.onCanonicalDeckResolved(canonicalDeck);
      }
      if (typeof buildOptions.onPlaybackStateResolved === 'function') {
        buildOptions.onPlaybackStateResolved(resolvedPlaybackState);
      }
      const persistableDeckSanitizerOptions = buildSanitizerOptions
        ? buildSanitizerOptions(resolvedPlaybackState, { resolveMetadataPersistenceOptions })
        : {};
      if (!sharedBuildPersistableDeckHtml) return '';
      return sharedBuildPersistableDeckHtml(doc, {
        ...persistableDeckSanitizerOptions
      });
    }

    return buildPersistableDeckHtml;
  }

  function createStudioEditorPersistableDeckHtmlGlobalApi(options = {}) {
    const buildPersistableDeckHtml = typeof options.buildPersistableDeckHtml === 'function'
      ? options.buildPersistableDeckHtml
      : null;
    return {
      buildPersistableDeckHtml: (...args) => buildPersistableDeckHtml
        ? buildPersistableDeckHtml(...args)
        : ''
    };
  }

  return {
    createStudioEditorPersistableDeckHtmlAction,
    createStudioEditorPersistableDeckHtmlGlobalApi
  };
}));
