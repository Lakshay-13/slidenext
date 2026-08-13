(function initStudioEditorPersistenceFailureAction(root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
    return;
  }
  root.SlideNextStudioEditorPersistenceFailureAction = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function createApi() {
  function createStudioEditorPersistenceFailureAction(options = {}) {
    const getPersistenceController = typeof options.getPersistenceController === 'function'
      ? options.getPersistenceController
      : () => options.persistenceController || null;
    const persistenceApi = options.persistenceApi || null;
    const persistenceStateApi = options.persistenceStateApi || null;
    const getCreateHandlerOptions = typeof options.getCreateHandlerOptions === 'function'
      ? options.getCreateHandlerOptions
      : () => null;
    let failureHandlerAdapter = null;

    function getFunction(api, name) {
      return api && typeof api[name] === 'function' ? api[name] : null;
    }

    function applyCurrentStudioPersistenceFailure(persistenceContext, nextOptions = {}) {
      const resolvedOptions = nextOptions && typeof nextOptions === 'object'
        ? nextOptions
        : {};
      const persistenceController = typeof getPersistenceController === 'function'
        ? getPersistenceController()
        : null;
      const controllerHandler = getFunction(persistenceController, 'handlePersistenceFailure');
      if (controllerHandler) {
        const result = controllerHandler(persistenceContext, resolvedOptions);
        if (result !== null && typeof result !== 'undefined') {
          return result;
        }
      }

      const createFailureHandlerAdapter = getFunction(
        persistenceStateApi,
        'createStudioEditorPersistenceFailureHandlerAdapter'
      );
      if (createFailureHandlerAdapter) {
        if (typeof failureHandlerAdapter !== 'function') {
          failureHandlerAdapter = createFailureHandlerAdapter({
            persistenceApi,
            createHandlerOptions: getCreateHandlerOptions()
          });
        }
        const result = typeof failureHandlerAdapter === 'function'
          ? failureHandlerAdapter(persistenceContext, resolvedOptions)
          : null;
        if (result !== null && typeof result !== 'undefined') {
          return result;
        }
      }

      const createFailureHandler = getFunction(
        persistenceApi,
        'createStudioPersistenceFailureHandler'
      );
      if (createFailureHandler) {
        return createFailureHandler({
          createHandlerOptions: getCreateHandlerOptions(),
          handlePersistenceFailure: getFunction(
            persistenceApi,
            'handleStudioPersistenceFailure'
          )
        })(persistenceContext, resolvedOptions);
      }

      const handlePersistenceFailure = getFunction(
        persistenceApi,
        'handleStudioPersistenceFailure'
      );
      if (!handlePersistenceFailure) return false;
      const createHandlerOptions = getCreateHandlerOptions();
      return handlePersistenceFailure(
        persistenceContext,
        typeof createHandlerOptions === 'function'
          ? createHandlerOptions(resolvedOptions)
          : resolvedOptions
      );
    }

    return applyCurrentStudioPersistenceFailure;
  }

  function createStudioEditorPersistenceFailureGlobalApi(options = {}) {
    const applyCurrentStudioPersistenceFailure =
      typeof options.applyCurrentStudioPersistenceFailure === 'function'
        ? options.applyCurrentStudioPersistenceFailure
        : null;
    return {
      applyCurrentStudioPersistenceFailure: (...args) =>
        applyCurrentStudioPersistenceFailure
          ? applyCurrentStudioPersistenceFailure(...args)
          : false
    };
  }

  return {
    createStudioEditorPersistenceFailureAction,
    createStudioEditorPersistenceFailureGlobalApi
  };
}));
