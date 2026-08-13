(function initStudioEditorVersionPersistenceSuccessAction(root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
    return;
  }
  root.SlideNextStudioEditorVersionPersistenceSuccessAction = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function createApi() {
  function createStudioEditorVersionPersistenceSuccessAction(options = {}) {
    const getPersistenceController = typeof options.getPersistenceController === 'function'
      ? options.getPersistenceController
      : () => options.persistenceController || null;
    const persistenceApi = options.persistenceApi || null;
    const persistenceStateApi = options.persistenceStateApi || null;
    const getCreateSessionReaderOptions =
      typeof options.getCreateSessionReaderOptions === 'function'
        ? options.getCreateSessionReaderOptions
        : () => null;
    const getRefreshVersionEntries = typeof options.getRefreshVersionEntries === 'function'
      ? options.getRefreshVersionEntries
      : () => null;
    let versionSuccessHandlerAdapter = null;

    function getFunction(api, name) {
      return api && typeof api[name] === 'function' ? api[name] : null;
    }

    function createVersionHandlerOptions(nextOptions = {}) {
      const createSessionReaderOptions = getCreateSessionReaderOptions();
      if (typeof createSessionReaderOptions !== 'function') return null;
      return createSessionReaderOptions({
        refreshVersionEntries: getRefreshVersionEntries(),
        ...nextOptions
      });
    }

    function applyCurrentStudioVersionPersistenceSuccess(persistenceContext, nextOptions = {}) {
      const resolvedOptions = nextOptions;
      const persistenceController = typeof getPersistenceController === 'function'
        ? getPersistenceController()
        : null;
      const controllerHandler = getFunction(
        persistenceController,
        'handleVersionPersistenceSuccess'
      );
      if (controllerHandler) {
        const result = controllerHandler(persistenceContext, resolvedOptions);
        if (result !== null && typeof result !== 'undefined') {
          return result;
        }
      }

      const createVersionSuccessHandlerAdapter = getFunction(
        persistenceStateApi,
        'createStudioEditorVersionPersistenceSuccessHandlerAdapter'
      );
      if (createVersionSuccessHandlerAdapter) {
        if (typeof versionSuccessHandlerAdapter !== 'function') {
          versionSuccessHandlerAdapter = createVersionSuccessHandlerAdapter({
            persistenceApi,
            createHandlerOptions: createVersionHandlerOptions
          });
        }
        const result = typeof versionSuccessHandlerAdapter === 'function'
          ? versionSuccessHandlerAdapter(persistenceContext, resolvedOptions)
          : null;
        if (result !== null && typeof result !== 'undefined') {
          return result;
        }
      }

      const createVersionSuccessHandler = getFunction(
        persistenceApi,
        'createStudioVersionPersistenceSuccessHandler'
      );
      if (createVersionSuccessHandler) {
        return createVersionSuccessHandler({
          createHandlerOptions: createVersionHandlerOptions,
          handleVersionPersistenceSuccess: getFunction(
            persistenceApi,
            'handleStudioVersionPersistenceSuccess'
          )
        })(persistenceContext, resolvedOptions);
      }

      const handleVersionPersistenceSuccess = getFunction(
        persistenceApi,
        'handleStudioVersionPersistenceSuccess'
      );
      if (!handleVersionPersistenceSuccess) return false;
      const handlerOptions = createVersionHandlerOptions(resolvedOptions);
      return handleVersionPersistenceSuccess(
        persistenceContext,
        handlerOptions === null ? resolvedOptions : handlerOptions
      );
    }

    return applyCurrentStudioVersionPersistenceSuccess;
  }

  function createStudioEditorVersionPersistenceSuccessGlobalApi(options = {}) {
    const applyCurrentStudioVersionPersistenceSuccess =
      typeof options.applyCurrentStudioVersionPersistenceSuccess === 'function'
        ? options.applyCurrentStudioVersionPersistenceSuccess
        : null;
    return {
      applyCurrentStudioVersionPersistenceSuccess: (...args) =>
        applyCurrentStudioVersionPersistenceSuccess
          ? applyCurrentStudioVersionPersistenceSuccess(...args)
          : false
    };
  }

  return {
    createStudioEditorVersionPersistenceSuccessAction,
    createStudioEditorVersionPersistenceSuccessGlobalApi
  };
}));
