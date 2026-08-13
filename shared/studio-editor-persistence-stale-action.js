(function initStudioEditorPersistenceStaleAction(root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
    return;
  }
  root.SlideNextStudioEditorPersistenceStaleAction = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function createApi() {
  function createStudioEditorPersistenceStaleAction(options = {}) {
    const getPersistenceController = typeof options.getPersistenceController === 'function'
      ? options.getPersistenceController
      : () => options.persistenceController || null;
    const persistenceApi = options.persistenceApi || null;
    const persistenceStateApi = options.persistenceStateApi || null;
    const getPresentationUrl = typeof options.getPresentationUrl === 'function'
      ? options.getPresentationUrl
      : () => '';
    const getSessionToken = typeof options.getSessionToken === 'function'
      ? options.getSessionToken
      : () => null;
    let staleCheckerAdapter = null;

    function getFunction(api, name) {
      return api && typeof api[name] === 'function' ? api[name] : null;
    }

    function isCurrentStudioPersistenceTaskStale(
      presentationUrl = getPresentationUrl(),
      sessionToken = getSessionToken()
    ) {
      const persistenceController = typeof getPersistenceController === 'function'
        ? getPersistenceController()
        : null;
      const controllerChecker = getFunction(
        persistenceController,
        'isPersistenceTaskStale'
      );
      if (controllerChecker) {
        const result = controllerChecker(presentationUrl, sessionToken);
        if (result !== null && typeof result !== 'undefined') {
          return result;
        }
      }

      const createStaleCheckerAdapter = getFunction(
        persistenceStateApi,
        'createStudioEditorPersistenceTaskStaleCheckerAdapter'
      );
      if (createStaleCheckerAdapter) {
        if (typeof staleCheckerAdapter !== 'function') {
          staleCheckerAdapter = createStaleCheckerAdapter({
            persistenceApi,
            getPresentationUrl,
            getSessionToken
          });
        }
        const result = typeof staleCheckerAdapter === 'function'
          ? staleCheckerAdapter(presentationUrl, sessionToken)
          : null;
        if (result !== null && typeof result !== 'undefined') {
          return result;
        }
      }

      const createStaleChecker = getFunction(
        persistenceApi,
        'createStudioPersistenceTaskStaleChecker'
      );
      if (createStaleChecker) {
        return createStaleChecker({
          getPresentationUrl,
          getSessionToken,
          isPersistenceTaskStale: getFunction(
            persistenceApi,
            'isStudioPersistenceTaskStale'
          )
        })(presentationUrl, sessionToken);
      }

      const isStudioPersistenceTaskStale = getFunction(
        persistenceApi,
        'isStudioPersistenceTaskStale'
      );
      if (!isStudioPersistenceTaskStale) return true;
      return isStudioPersistenceTaskStale(presentationUrl, {
        currentPresentationUrl: getPresentationUrl(),
        currentSessionToken: getSessionToken(),
        sessionToken
      });
    }

    return isCurrentStudioPersistenceTaskStale;
  }

  function createStudioEditorPersistenceStaleGlobalApi(options = {}) {
    const isCurrentStudioPersistenceTaskStale =
      typeof options.isCurrentStudioPersistenceTaskStale === 'function'
        ? options.isCurrentStudioPersistenceTaskStale
        : null;
    return {
      isCurrentStudioPersistenceTaskStale: (...args) =>
        isCurrentStudioPersistenceTaskStale
          ? isCurrentStudioPersistenceTaskStale(...args)
          : true
    };
  }

  return {
    createStudioEditorPersistenceStaleAction,
    createStudioEditorPersistenceStaleGlobalApi
  };
}));
