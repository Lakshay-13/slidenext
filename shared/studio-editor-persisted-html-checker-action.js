(function initStudioEditorPersistedHtmlCheckerAction(root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
    return;
  }
  root.SlideNextStudioEditorPersistedHtmlCheckerAction = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function createApi() {
  function createStudioEditorPersistedHtmlCheckerAction(options = {}) {
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

    function isCurrentDeckHtmlPersisted(cleanHtml) {
      const persistenceController = typeof getPersistenceController === 'function'
        ? getPersistenceController()
        : null;
      if (persistenceController
        && typeof persistenceController.isPersistedDeckHtml === 'function') {
        const result = persistenceController.isPersistedDeckHtml(cleanHtml);
        if (result !== null && typeof result !== 'undefined') {
          return result;
        }
      }

      const createCheckerAdapter = getFunction(
        persistenceStateApi,
        'createStudioEditorPersistedDeckHtmlCheckerAdapter'
      );
      if (createCheckerAdapter) {
        if (typeof checkerAdapter !== 'function') {
          checkerAdapter = createCheckerAdapter({
            persistenceApi,
            readPersistedDeckState: getPersistedDeckState
          });
        }
        const result = typeof checkerAdapter === 'function'
          ? checkerAdapter(cleanHtml)
          : null;
        if (result !== null && typeof result !== 'undefined') {
          return result;
        }
      }

      const createPersistedDeckHtmlChecker = getFunction(
        persistenceApi,
        'createStudioPersistedDeckHtmlChecker'
      );
      if (createPersistedDeckHtmlChecker) {
        return createPersistedDeckHtmlChecker({
          readPersistedDeckState: getPersistedDeckState,
          isPersistedDeckHtml: getFunction(
            persistenceApi,
            'isStudioPersistedDeckHtml'
          )
        })(cleanHtml);
      }

      const isStudioPersistedDeckHtml = getFunction(
        persistenceApi,
        'isStudioPersistedDeckHtml'
      );
      if (!isStudioPersistedDeckHtml) return false;
      return isStudioPersistedDeckHtml(cleanHtml, getPersistedDeckState());
    }

    return isCurrentDeckHtmlPersisted;
  }

  function createStudioEditorPersistedHtmlCheckerGlobalApi(options = {}) {
    const isCurrentDeckHtmlPersisted = typeof options.isCurrentDeckHtmlPersisted === 'function'
      ? options.isCurrentDeckHtmlPersisted
      : null;
    return {
      isCurrentDeckHtmlPersisted: (...args) => isCurrentDeckHtmlPersisted
        ? isCurrentDeckHtmlPersisted(...args)
        : false
    };
  }

  return {
    createStudioEditorPersistedHtmlCheckerAction,
    createStudioEditorPersistedHtmlCheckerGlobalApi
  };
}));
