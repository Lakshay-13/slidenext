(function initStudioEditorPersistedSaveRequestCheckerAction(root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
    return;
  }
  root.SlideNextStudioEditorPersistedSaveRequestCheckerAction = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function createApi() {
  function createStudioEditorPersistedSaveRequestCheckerAction(options = {}) {
    const getPersistenceController = typeof options.getPersistenceController === 'function'
      ? options.getPersistenceController
      : () => options.persistenceController || null;
    const persistenceApi = options.persistenceApi || null;
    const persistenceStateApi = options.persistenceStateApi || null;
    const getPersistedDeckState = typeof options.getPersistedDeckState === 'function'
      ? options.getPersistedDeckState
      : () => options.persistedDeckState || {};
    let checkerAdapter = null;

    function getFunction(api, name) {
      return api && typeof api[name] === 'function' ? api[name] : null;
    }

    function isCurrentDeckStatePersisted(
      saveRequestBody = null,
      cleanHtml = saveRequestBody && saveRequestBody.htmlContent
    ) {
      const persistenceController = typeof getPersistenceController === 'function'
        ? getPersistenceController()
        : null;
      if (persistenceController
        && typeof persistenceController.isPersistedSaveRequest === 'function') {
        const result = persistenceController.isPersistedSaveRequest(saveRequestBody, cleanHtml);
        if (result !== null && typeof result !== 'undefined') {
          return result;
        }
      }

      const createCheckerAdapter = getFunction(
        persistenceStateApi,
        'createStudioEditorPersistedSaveRequestCheckerAdapter'
      );
      if (createCheckerAdapter) {
        if (typeof checkerAdapter !== 'function') {
          checkerAdapter = createCheckerAdapter({
            persistenceApi,
            readPersistedDeckState: getPersistedDeckState
          });
        }
        const result = typeof checkerAdapter === 'function'
          ? checkerAdapter(saveRequestBody, cleanHtml)
          : null;
        if (result !== null && typeof result !== 'undefined') {
          return result;
        }
      }

      const createPersistedSaveRequestChecker = getFunction(
        persistenceApi,
        'createStudioPersistedSaveRequestChecker'
      );
      if (createPersistedSaveRequestChecker) {
        return createPersistedSaveRequestChecker({
          readPersistedDeckState: getPersistedDeckState,
          isPersistedSaveRequest: getFunction(
            persistenceApi,
            'isStudioPersistedSaveRequest'
          )
        })(saveRequestBody, cleanHtml);
      }

      const isStudioPersistedSaveRequest = getFunction(
        persistenceApi,
        'isStudioPersistedSaveRequest'
      );
      if (!isStudioPersistedSaveRequest) return false;
      return isStudioPersistedSaveRequest(
        saveRequestBody,
        getPersistedDeckState(),
        cleanHtml
      );
    }

    return isCurrentDeckStatePersisted;
  }

  function createStudioEditorPersistedSaveRequestCheckerGlobalApi(options = {}) {
    const isCurrentDeckStatePersisted = typeof options.isCurrentDeckStatePersisted === 'function'
      ? options.isCurrentDeckStatePersisted
      : null;
    return {
      isCurrentDeckStatePersisted: (...args) => isCurrentDeckStatePersisted
        ? isCurrentDeckStatePersisted(...args)
        : false
    };
  }

  return {
    createStudioEditorPersistedSaveRequestCheckerAction,
    createStudioEditorPersistedSaveRequestCheckerGlobalApi
  };
}));
