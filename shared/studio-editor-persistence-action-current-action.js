(function initStudioEditorPersistenceActionCurrentAction(root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
    return;
  }
  root.SlideNextStudioEditorPersistenceActionCurrentAction = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function createApi() {
  function createStudioEditorPersistenceActionCurrentAction(options = {}) {
    const getPersistenceController = typeof options.getPersistenceController === 'function'
      ? options.getPersistenceController
      : () => options.persistenceController || null;
    const persistenceApi = options.persistenceApi || null;
    const persistenceStateApi = options.persistenceStateApi || null;
    const getReadCurrentSessionState = typeof options.getReadCurrentSessionState === 'function'
      ? options.getReadCurrentSessionState
      : () => null;
    let currentActionRunnerAdapter = null;

    function getFunction(api, name) {
      return api && typeof api[name] === 'function' ? api[name] : null;
    }

    function runCurrentStudioPersistenceActionIfCurrent(persistenceContext, action) {
      const persistenceController = typeof getPersistenceController === 'function'
        ? getPersistenceController()
        : null;
      const controllerRunner = getFunction(
        persistenceController,
        'runPersistenceActionIfCurrent'
      );
      if (controllerRunner) {
        const result = controllerRunner(persistenceContext, action);
        if (result !== null && typeof result !== 'undefined') {
          return result;
        }
      }

      const createCurrentActionRunnerAdapter = getFunction(
        persistenceStateApi,
        'createStudioEditorPersistenceActionCurrentRunnerAdapter'
      );
      if (createCurrentActionRunnerAdapter) {
        if (typeof currentActionRunnerAdapter !== 'function') {
          currentActionRunnerAdapter = createCurrentActionRunnerAdapter({
            persistenceApi,
            readCurrentSessionState: getReadCurrentSessionState()
          });
        }
        const result = typeof currentActionRunnerAdapter === 'function'
          ? currentActionRunnerAdapter(persistenceContext, action)
          : null;
        if (result !== null && typeof result !== 'undefined') {
          return result;
        }
      }

      const createCurrentActionRunner = getFunction(
        persistenceApi,
        'createStudioPersistenceActionCurrentRunner'
      );
      if (createCurrentActionRunner) {
        return createCurrentActionRunner({
          readCurrentSessionState: getReadCurrentSessionState(),
          runPersistenceActionIfCurrent: getFunction(
            persistenceApi,
            'runStudioPersistenceActionIfCurrent'
          )
        })(persistenceContext, action);
      }

      const runPersistenceActionIfCurrent = getFunction(
        persistenceApi,
        'runStudioPersistenceActionIfCurrent'
      );
      if (!runPersistenceActionIfCurrent) return false;
      const readCurrentSessionState = getReadCurrentSessionState();
      return runPersistenceActionIfCurrent(
        persistenceContext,
        typeof readCurrentSessionState === 'function'
          ? readCurrentSessionState()
          : readCurrentSessionState,
        action
      );
    }

    return runCurrentStudioPersistenceActionIfCurrent;
  }

  function createStudioEditorPersistenceActionCurrentGlobalApi(options = {}) {
    const runCurrentStudioPersistenceActionIfCurrent =
      typeof options.runCurrentStudioPersistenceActionIfCurrent === 'function'
        ? options.runCurrentStudioPersistenceActionIfCurrent
        : null;
    return {
      runCurrentStudioPersistenceActionIfCurrent: (...args) =>
        runCurrentStudioPersistenceActionIfCurrent
          ? runCurrentStudioPersistenceActionIfCurrent(...args)
          : false
    };
  }

  return {
    createStudioEditorPersistenceActionCurrentAction,
    createStudioEditorPersistenceActionCurrentGlobalApi
  };
}));
