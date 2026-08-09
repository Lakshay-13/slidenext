(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorAutoVersionRuntime = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function resolveControllerApi(options = {}) {
    return options.controllerApi
      || (root && root.SlideNextStudioEditorAutoVersionController)
      || null;
  }

  function createStudioEditorAutoVersionRuntime(options = {}) {
    const controllerApi = resolveControllerApi(options);
    const autoVersionController = controllerApi
      && typeof controllerApi.createStudioEditorAutoVersionController === 'function'
      ? controllerApi.createStudioEditorAutoVersionController({
          versionActions: options.versionActions
            || (root && root.SlideNextStudioVersionActions)
            || null,
          captureSessionState: options.captureSessionState,
          getTimer: options.getTimer,
          clearScheduledTimer: options.clearScheduledTimer,
          setTimer: options.setTimer,
          clearStoredTimer: options.clearStoredTimer,
          schedule: options.schedule,
          execute: options.execute
        })
      : null;
    const autoVersionExecutor = controllerApi
      && typeof controllerApi.createStudioEditorAutoVersionExecutor === 'function'
      ? controllerApi.createStudioEditorAutoVersionExecutor({
          persistenceApi: options.persistenceApi
            || (root && root.SlideNextStudioEditorPersistence)
            || null,
          isTaskStale: options.isTaskStale,
          getDocument: options.getDocument,
          resolvePersistenceState: options.resolvePersistenceState,
          isPersistedState: options.isPersistedState,
          buildSaveRequestBody: options.buildSaveRequestBody,
          saveCheckpoint: options.saveCheckpoint,
          logger: options.logger
        })
      : null;

    return {
      autoVersionController,
      autoVersionExecutor
    };
  }

  return {
    createStudioEditorAutoVersionRuntime
  };
});
