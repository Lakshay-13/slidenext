(function initStudioEditorVersionCheckpointSaveAction(root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
    return;
  }
  root.SlideNextStudioEditorVersionCheckpointSaveAction = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function createApi() {
  function createStudioEditorVersionCheckpointSaveAction(options = {}) {
    const persistenceApi = options.persistenceApi || null;
    const getSaveVersionCheckpoint = typeof options.getSaveVersionCheckpoint === 'function'
      ? options.getSaveVersionCheckpoint
      : () => null;
    const getApplyVersionPersistenceSuccess =
      typeof options.getApplyVersionPersistenceSuccess === 'function'
        ? options.getApplyVersionPersistenceSuccess
        : () => null;
    const getApplyPersistenceFailure = typeof options.getApplyPersistenceFailure === 'function'
      ? options.getApplyPersistenceFailure
      : () => null;

    async function executeCurrentStudioVersionCheckpointSaveWithFailure(
      versionLabel,
      versionCheckpointPersistenceState,
      presentationUrl = '',
      nextOptions = {}
    ) {
      const executeVersionCheckpointSaveWithFailure = persistenceApi
        && typeof persistenceApi.executeStudioVersionCheckpointSaveWithFailure === 'function'
        ? persistenceApi.executeStudioVersionCheckpointSaveWithFailure
        : null;
      if (!executeVersionCheckpointSaveWithFailure) return null;

      const onSuccess = typeof nextOptions.onSuccess === 'function'
        ? nextOptions.onSuccess
        : null;
      const onFailure = typeof nextOptions.onFailure === 'function'
        ? nextOptions.onFailure
        : null;
      return executeVersionCheckpointSaveWithFailure(
        versionLabel,
        versionCheckpointPersistenceState,
        presentationUrl,
        {
          saveVersionCheckpoint: getSaveVersionCheckpoint(),
          applyVersionCheckpointSaveSuccess: (
            nextVersionCheckpointPersistenceState,
            successOptions = {}
          ) => {
            if (!nextVersionCheckpointPersistenceState
              || !nextVersionCheckpointPersistenceState.persistenceContext) {
              return false;
            }
            const applyVersionPersistenceSuccess = getApplyVersionPersistenceSuccess();
            return typeof applyVersionPersistenceSuccess === 'function'
              ? applyVersionPersistenceSuccess(
                  nextVersionCheckpointPersistenceState.persistenceContext,
                  {
                    onSuccess: successOptions.onSuccess
                  }
                )
              : false;
          },
          successOptions: {
            onSuccess
          },
          applyPersistenceFailure: (persistenceContext, failureOptions = {}) => {
            const applyPersistenceFailure = getApplyPersistenceFailure();
            return typeof applyPersistenceFailure === 'function'
              ? applyPersistenceFailure(persistenceContext, failureOptions)
              : false;
          },
          buildFailureOptions: (data) => ({
            onFailure: onFailure
              ? () => {
                  onFailure(data);
                }
              : undefined
          })
        }
      );
    }

    return executeCurrentStudioVersionCheckpointSaveWithFailure;
  }

  function createStudioEditorVersionCheckpointSaveGlobalApi(options = {}) {
    const executeCurrentStudioVersionCheckpointSaveWithFailure =
      typeof options.executeCurrentStudioVersionCheckpointSaveWithFailure === 'function'
        ? options.executeCurrentStudioVersionCheckpointSaveWithFailure
        : null;
    return {
      executeCurrentStudioVersionCheckpointSaveWithFailure: (...args) =>
        executeCurrentStudioVersionCheckpointSaveWithFailure
          ? executeCurrentStudioVersionCheckpointSaveWithFailure(...args)
          : null
    };
  }

  return {
    createStudioEditorVersionCheckpointSaveAction,
    createStudioEditorVersionCheckpointSaveGlobalApi
  };
}));
