(function initStudioEditorSaveVersionCheckpointAction(root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
    return;
  }
  root.SlideNextStudioEditorSaveVersionCheckpointAction = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function createApi() {
  function createStudioEditorSaveVersionCheckpointAction(options = {}) {
    const persistenceApi = options.persistenceApi || null;
    const getPresentationUrl = typeof options.getPresentationUrl === 'function'
      ? options.getPresentationUrl
      : () => '';
    const getIsPersistedState = typeof options.getIsPersistedState === 'function'
      ? options.getIsPersistedState
      : () => null;
    const getBuildSaveRequestBody = typeof options.getBuildSaveRequestBody === 'function'
      ? options.getBuildSaveRequestBody
      : () => null;
    const getResolvePlaybackState = typeof options.getResolvePlaybackState === 'function'
      ? options.getResolvePlaybackState
      : () => null;
    const getFetch = typeof options.getFetch === 'function'
      ? options.getFetch
      : () => null;
    const getApplyPersistenceSuccess = typeof options.getApplyPersistenceSuccess === 'function'
      ? options.getApplyPersistenceSuccess
      : () => null;

    async function saveVersionCheckpoint(
      versionLabel,
      cleanHtml,
      presentationUrl = getPresentationUrl(),
      nextOptions = {}
    ) {
      const executeVersionCheckpointPersistenceRequestWithSuccess = persistenceApi
        && typeof persistenceApi.executeStudioVersionCheckpointPersistenceRequestWithSuccess === 'function'
        ? persistenceApi.executeStudioVersionCheckpointPersistenceRequestWithSuccess
        : null;
      if (!executeVersionCheckpointPersistenceRequestWithSuccess) return null;
      const versionCheckpointResult = await executeVersionCheckpointPersistenceRequestWithSuccess(
        versionLabel,
        cleanHtml,
        presentationUrl,
        {
          ...nextOptions,
          isPersistedState: getIsPersistedState(),
          buildSaveRequestBody: getBuildSaveRequestBody(),
          resolvePlaybackState: getResolvePlaybackState(),
          fetchImpl: getFetch(),
          applyPersistenceSuccess: (persistenceContext, successOptions = {}) => {
            const applyPersistenceSuccess = getApplyPersistenceSuccess();
            return typeof applyPersistenceSuccess === 'function'
              ? applyPersistenceSuccess(persistenceContext, successOptions)
              : null;
          },
          successOptions: {
            presentationUrl
          }
        }
      );
      return versionCheckpointResult ? versionCheckpointResult.data : null;
    }

    return saveVersionCheckpoint;
  }

  function createStudioEditorSaveVersionCheckpointGlobalApi(options = {}) {
    const saveVersionCheckpoint = typeof options.saveVersionCheckpoint === 'function'
      ? options.saveVersionCheckpoint
      : null;
    return {
      saveVersionCheckpoint: (...args) =>
        saveVersionCheckpoint
          ? saveVersionCheckpoint(...args)
          : null
    };
  }

  return {
    createStudioEditorSaveVersionCheckpointAction,
    createStudioEditorSaveVersionCheckpointGlobalApi
  };
}));
