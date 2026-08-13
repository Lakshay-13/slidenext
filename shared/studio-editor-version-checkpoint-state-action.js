(function initStudioEditorVersionCheckpointStateAction(root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
    return;
  }
  root.SlideNextStudioEditorVersionCheckpointStateAction = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function createApi() {
  function createStudioEditorVersionCheckpointStateAction(options = {}) {
    const getDocument = typeof options.getDocument === 'function'
      ? options.getDocument
      : () => null;
    const getPresentationUrl = typeof options.getPresentationUrl === 'function'
      ? options.getPresentationUrl
      : () => '';
    const getSessionToken = typeof options.getSessionToken === 'function'
      ? options.getSessionToken
      : () => null;
    const getResolvePersistenceStateFromCapture =
      typeof options.getResolvePersistenceStateFromCapture === 'function'
        ? options.getResolvePersistenceStateFromCapture
        : () => null;
    const persistenceApi = options.persistenceApi || null;

    function resolveCurrentStudioVersionCheckpointPersistenceState(
      doc = getDocument(),
      presentationUrl = getPresentationUrl(),
      sessionToken = getSessionToken()
    ) {
      const resolvePersistenceStateFromCapture = getResolvePersistenceStateFromCapture();
      const resolveVersionCheckpointState = persistenceApi
        && typeof persistenceApi.resolveStudioVersionCheckpointPersistenceStateFromCapture === 'function'
        ? persistenceApi.resolveStudioVersionCheckpointPersistenceStateFromCapture
        : null;
      if (typeof resolvePersistenceStateFromCapture !== 'function') {
        return null;
      }
      return resolvePersistenceStateFromCapture(doc, {
        presentationUrl,
        resolvePersistenceStateFromCapture: resolveVersionCheckpointState,
        persistenceOptions: {
          sessionToken
        }
      });
    }

    return resolveCurrentStudioVersionCheckpointPersistenceState;
  }

  function createStudioEditorVersionCheckpointStateGlobalApi(options = {}) {
    const resolveCurrentStudioVersionCheckpointPersistenceState =
      typeof options.resolveCurrentStudioVersionCheckpointPersistenceState === 'function'
        ? options.resolveCurrentStudioVersionCheckpointPersistenceState
        : null;
    return {
      resolveCurrentStudioVersionCheckpointPersistenceState: (...args) =>
        resolveCurrentStudioVersionCheckpointPersistenceState
          ? resolveCurrentStudioVersionCheckpointPersistenceState(...args)
          : null
    };
  }

  return {
    createStudioEditorVersionCheckpointStateAction,
    createStudioEditorVersionCheckpointStateGlobalApi
  };
}));
