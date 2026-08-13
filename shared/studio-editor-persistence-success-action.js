(function initStudioEditorPersistenceSuccessAction(root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
    return;
  }
  root.SlideNextStudioEditorPersistenceSuccessAction = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function createApi() {
  function createStudioEditorPersistenceSuccessAction(options = {}) {
    const getPersistenceController = typeof options.getPersistenceController === 'function'
      ? options.getPersistenceController
      : () => options.persistenceController || null;
    const persistenceApi = options.persistenceApi || null;
    const persistenceStateApi = options.persistenceStateApi || null;
    const getCreateHandlerOptions = typeof options.getCreateHandlerOptions === 'function'
      ? options.getCreateHandlerOptions
      : () => null;
    let successHandlerAdapter = null;

    function getFunction(api, name) {
      return api && typeof api[name] === 'function' ? api[name] : null;
    }

    function applyCurrentStudioPersistenceSuccess(persistenceContext, nextOptions = {}) {
      const resolvedOptions = nextOptions;
      const persistenceController = typeof getPersistenceController === 'function'
        ? getPersistenceController()
        : null;
      const controllerHandler = getFunction(persistenceController, 'handlePersistenceSuccess');
      if (controllerHandler) {
        const result = controllerHandler(persistenceContext, resolvedOptions);
        if (result !== null && typeof result !== 'undefined') {
          return result;
        }
      }

      const createSuccessHandlerAdapter = getFunction(
        persistenceStateApi,
        'createStudioEditorPersistenceSuccessHandlerAdapter'
      );
      if (createSuccessHandlerAdapter) {
        if (typeof successHandlerAdapter !== 'function') {
          successHandlerAdapter = createSuccessHandlerAdapter({
            persistenceApi,
            createHandlerOptions: getCreateHandlerOptions()
          });
        }
        const result = typeof successHandlerAdapter === 'function'
          ? successHandlerAdapter(persistenceContext, resolvedOptions)
          : null;
        if (result !== null && typeof result !== 'undefined') {
          return result;
        }
      }

      const createSuccessHandler = getFunction(
        persistenceApi,
        'createStudioPersistenceSuccessHandler'
      );
      if (createSuccessHandler) {
        return createSuccessHandler({
          createHandlerOptions: getCreateHandlerOptions(),
          handlePersistenceSuccess: getFunction(
            persistenceApi,
            'handleStudioPersistenceSuccess'
          )
        })(persistenceContext, resolvedOptions);
      }

      const handlePersistenceSuccess = getFunction(
        persistenceApi,
        'handleStudioPersistenceSuccess'
      );
      if (!handlePersistenceSuccess) return false;
      const createHandlerOptions = getCreateHandlerOptions();
      return handlePersistenceSuccess(
        persistenceContext,
        typeof createHandlerOptions === 'function'
          ? createHandlerOptions(resolvedOptions)
          : resolvedOptions
      );
    }

    return applyCurrentStudioPersistenceSuccess;
  }

  function createStudioEditorPersistenceSuccessGlobalApi(options = {}) {
    const applyCurrentStudioPersistenceSuccess =
      typeof options.applyCurrentStudioPersistenceSuccess === 'function'
        ? options.applyCurrentStudioPersistenceSuccess
        : null;
    return {
      applyCurrentStudioPersistenceSuccess: (...args) =>
        applyCurrentStudioPersistenceSuccess
          ? applyCurrentStudioPersistenceSuccess(...args)
          : false
    };
  }

  return {
    createStudioEditorPersistenceSuccessAction,
    createStudioEditorPersistenceSuccessGlobalApi
  };
}));
