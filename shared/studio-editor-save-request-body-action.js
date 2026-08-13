(function initStudioEditorSaveRequestBodyAction(root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
    return;
  }
  root.SlideNextStudioEditorSaveRequestBodyAction = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function createApi() {
  function createStudioEditorSaveRequestBodyAction(options = {}) {
    const getDocument = typeof options.getDocument === 'function'
      ? options.getDocument
      : () => null;
    const getPresentationUrl = typeof options.getPresentationUrl === 'function'
      ? options.getPresentationUrl
      : () => '';
    const getSessionToken = typeof options.getSessionToken === 'function'
      ? options.getSessionToken
      : () => null;
    const getPersistenceController = typeof options.getPersistenceController === 'function'
      ? options.getPersistenceController
      : () => options.persistenceController || null;
    const persistenceApi = options.persistenceApi || null;
    const persistenceStateApi = options.persistenceStateApi || null;
    const getCapturePersistableDeckState =
      typeof options.getCapturePersistableDeckState === 'function'
        ? options.getCapturePersistableDeckState
        : () => null;
    const getResolveCanonicalDeckOverride =
      typeof options.getResolveCanonicalDeckOverride === 'function'
        ? options.getResolveCanonicalDeckOverride
        : () => null;
    const getBuildCanonicalDeck = typeof options.getBuildCanonicalDeck === 'function'
      ? options.getBuildCanonicalDeck
      : () => null;
    const getResolveLiveCanonicalDeck =
      typeof options.getResolveLiveCanonicalDeck === 'function'
        ? options.getResolveLiveCanonicalDeck
        : () => null;
    const getBuildPersistableDeckHtml =
      typeof options.getBuildPersistableDeckHtml === 'function'
        ? options.getBuildPersistableDeckHtml
        : () => null;
    let saveRequestBodyAdapter = null;

    function getFunction(api, name) {
      return api && typeof api[name] === 'function' ? api[name] : null;
    }

    function resolveDependency(getter) {
      const dependency = typeof getter === 'function' ? getter() : null;
      return typeof dependency === 'function' ? dependency : null;
    }

    function resolveCanonicalDeck(providedCanonicalDeck, doc) {
      const resolveOverride = resolveDependency(getResolveCanonicalDeckOverride);
      const buildCanonicalDeck = resolveDependency(getBuildCanonicalDeck);
      if (resolveOverride) {
        const resolvedCanonicalDeck = resolveOverride(providedCanonicalDeck, {
          sourceDocument: doc,
          buildCanonicalDeck: () => buildCanonicalDeck ? buildCanonicalDeck(doc) : null
        });
        if (resolvedCanonicalDeck !== null && typeof resolvedCanonicalDeck !== 'undefined') {
          return resolvedCanonicalDeck;
        }
      }
      return providedCanonicalDeck
        || (buildCanonicalDeck ? buildCanonicalDeck(doc) : null);
    }

    function resolveLiveCanonicalDeck(doc, options = {}) {
      if (typeof options.getLiveCanonicalDeck === 'function') {
        return options.getLiveCanonicalDeck;
      }
      const configuredReader = resolveDependency(getResolveLiveCanonicalDeck);
      return (sourceDoc = doc) => {
        const resolveEditorLiveCanonicalDeck = configuredReader
          || resolveDependency(getResolveLiveCanonicalDeck);
        return resolveEditorLiveCanonicalDeck
          ? resolveEditorLiveCanonicalDeck(
              sourceDoc,
              typeof getSessionToken === 'function' ? getSessionToken() : null
            )
          : null;
      };
    }

    function buildEditorSaveRequestBody(
      doc = getDocument(),
      cleanHtml = null,
      options = {}
    ) {
      const resolvedOptions = options && typeof options === 'object' ? options : {};
      const presentationUrl = Object.prototype.hasOwnProperty.call(resolvedOptions, 'presentationUrl')
        ? resolvedOptions.presentationUrl
        : getPresentationUrl();
      const providedCanonicalDeck = Object.prototype.hasOwnProperty.call(resolvedOptions, 'canonicalDeck')
        ? resolvedOptions.canonicalDeck
        : null;
      const getLiveCanonicalDeck = resolveLiveCanonicalDeck(doc, resolvedOptions);
      const buildStudioSaveRequestBody = getFunction(
        persistenceApi,
        'buildStudioSaveRequestBody'
      );
      const persistenceController = typeof getPersistenceController === 'function'
        ? getPersistenceController()
        : null;
      const capturePersistableDeckState = typeof resolvedOptions.capturePersistableDeckState === 'function'
        ? resolvedOptions.capturePersistableDeckState
        : resolveDependency(getCapturePersistableDeckState);
      const resolveCanonicalDeckOption = typeof resolvedOptions.resolveCanonicalDeck === 'function'
        ? resolvedOptions.resolveCanonicalDeck
        : (nextCanonicalDeck, nextDoc = doc) => resolveCanonicalDeck(nextCanonicalDeck, nextDoc);
      const buildPersistableDeckHtml = typeof resolvedOptions.buildPersistableDeckHtml === 'function'
        ? resolvedOptions.buildPersistableDeckHtml
        : resolveDependency(getBuildPersistableDeckHtml);

      if (persistenceController
        && typeof persistenceController.buildSaveRequestBody === 'function') {
        const saveRequestBody = persistenceController.buildSaveRequestBody(doc, cleanHtml, {
          ...resolvedOptions,
          capturePersistableDeckState,
          resolveCanonicalDeck: resolveCanonicalDeckOption,
          getLiveCanonicalDeck,
          buildPersistableDeckHtml
        });
        if (saveRequestBody !== null && typeof saveRequestBody !== 'undefined') {
          return saveRequestBody;
        }
      }

      const createSaveRequestBodyAdapter = getFunction(
        persistenceStateApi,
        'createStudioEditorSaveRequestBodyAdapter'
      );
      if (createSaveRequestBodyAdapter) {
        if (typeof saveRequestBodyAdapter !== 'function') {
          saveRequestBodyAdapter = createSaveRequestBodyAdapter({
            persistenceApi,
            getPresentationUrl
          });
        }
        const saveRequestOptions = {
          ...resolvedOptions,
          capturePersistableDeckState,
          resolveCanonicalDeck: resolveCanonicalDeckOption,
          getLiveCanonicalDeck,
          buildPersistableDeckHtml
        };
        const saveRequestBody = typeof saveRequestBodyAdapter === 'function'
          ? saveRequestBodyAdapter(doc, cleanHtml, saveRequestOptions)
          : null;
        if (saveRequestBody !== null && typeof saveRequestBody !== 'undefined') {
          return saveRequestBody;
        }
      }

      const createStudioSaveRequestBodyBuilder = getFunction(
        persistenceApi,
        'createStudioSaveRequestBodyBuilder'
      );
      if (createStudioSaveRequestBodyBuilder) {
        return createStudioSaveRequestBodyBuilder({
          getPresentationUrl,
          resolveSaveRequestDeckState: getFunction(
            persistenceApi,
            'resolveStudioSaveRequestDeckState'
          ),
          buildSaveRequestBody: buildStudioSaveRequestBody,
          capturePersistableDeckState,
          resolveCanonicalDeck: resolveCanonicalDeckOption,
          getLiveCanonicalDeck,
          buildPersistableDeckHtml
        })(doc, cleanHtml, options);
      }

      const resolveStudioSaveRequestDeckState = getFunction(
        persistenceApi,
        'resolveStudioSaveRequestDeckState'
      );
      if (resolveStudioSaveRequestDeckState) {
        const resolvedDeckState = resolveStudioSaveRequestDeckState(doc, cleanHtml, {
          canonicalDeck: providedCanonicalDeck,
          capturePersistableDeckState,
          resolveCanonicalDeck: resolveCanonicalDeckOption,
          getLiveCanonicalDeck,
          buildPersistableDeckHtml
        });
        if (!buildStudioSaveRequestBody) return null;
        return buildStudioSaveRequestBody(
          presentationUrl,
          resolvedDeckState.cleanHtml,
          {
            isAutoSave: !!resolvedOptions.isAutoSave,
            versionLabel: resolvedOptions.versionLabel,
            canonicalDeck: resolvedDeckState.canonicalDeck
          }
        );
      }

      const capturedDeckState = typeof cleanHtml === 'string' || !capturePersistableDeckState
        ? null
        : capturePersistableDeckState(doc, {
            canonicalDeck: providedCanonicalDeck
          });
      const resolvedCanonicalDeck = capturedDeckState && capturedDeckState.canonicalDeck
        ? capturedDeckState.canonicalDeck
        : resolveCanonicalDeckOption(providedCanonicalDeck, doc);
      const resolvedCleanHtml = typeof cleanHtml === 'string'
        ? cleanHtml
        : capturedDeckState && typeof capturedDeckState.cleanHtml === 'string'
          ? capturedDeckState.cleanHtml
          : buildPersistableDeckHtml
            ? buildPersistableDeckHtml(doc, {
                canonicalDeck: resolvedCanonicalDeck
              })
            : '';
      if (!buildStudioSaveRequestBody) return null;
      return buildStudioSaveRequestBody(
        presentationUrl,
        resolvedCleanHtml,
        {
          isAutoSave: !!resolvedOptions.isAutoSave,
          versionLabel: resolvedOptions.versionLabel,
          canonicalDeck: resolvedCanonicalDeck,
          getLiveCanonicalDeck
        }
      );
    }

    return buildEditorSaveRequestBody;
  }

  function createStudioEditorSaveRequestBodyGlobalApi(options = {}) {
    const buildEditorSaveRequestBody = typeof options.buildEditorSaveRequestBody === 'function'
      ? options.buildEditorSaveRequestBody
      : null;
    return {
      buildEditorSaveRequestBody: (...args) => buildEditorSaveRequestBody
        ? buildEditorSaveRequestBody(...args)
        : null
    };
  }

  return {
    createStudioEditorSaveRequestBodyAction,
    createStudioEditorSaveRequestBodyGlobalApi
  };
}));
