(function initStudioEditorPersistedDeckStateAction(root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
    return;
  }
  root.SlideNextStudioEditorPersistedDeckStateAction = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function createApi() {
  function createStudioEditorPersistedDeckStateAction(options = {}) {
    const getPersistenceController = typeof options.getPersistenceController === 'function'
      ? options.getPersistenceController
      : () => options.persistenceController || null;
    const persistenceStateApi = options.persistenceStateApi || null;
    const persistenceApi = options.persistenceApi || null;
    const resolveCanonicalDeck = typeof options.resolveCanonicalDeck === 'function'
      ? options.resolveCanonicalDeck
      : (canonicalDeck) => canonicalDeck || null;
    const normalizePlaybackState = typeof options.normalizePlaybackState === 'function'
      ? options.normalizePlaybackState
      : (playbackState) => playbackState || null;
    const setPersistedDeckHtml = typeof options.setPersistedDeckHtml === 'function'
      ? options.setPersistedDeckHtml
      : () => {};
    const setPersistedCanonicalDeck = typeof options.setPersistedCanonicalDeck === 'function'
      ? options.setPersistedCanonicalDeck
      : () => {};
    const setPersistedPlaybackState = typeof options.setPersistedPlaybackState === 'function'
      ? options.setPersistedPlaybackState
      : () => {};
    let persistedStateAdapter = null;

    function updateEditorPersistedDeckState(nextState = {}) {
      const persistenceController = getPersistenceController();
      if (persistenceController && typeof persistenceController.update === 'function') {
        return persistenceController.update(nextState);
      }
      if (typeof persistedStateAdapter !== 'function') {
        const createPersistedStateAdapter = persistenceStateApi
          && typeof persistenceStateApi.createStudioEditorPersistedDeckStateAdapter === 'function'
          ? persistenceStateApi.createStudioEditorPersistedDeckStateAdapter
          : null;
        persistedStateAdapter = createPersistedStateAdapter
          ? createPersistedStateAdapter({
              persistenceApi,
              resolveCanonicalDeck,
              normalizePlaybackState,
              setPersistedDeckHtml,
              setPersistedCanonicalDeck,
              setPersistedPlaybackState
            })
          : null;
      }
      return typeof persistedStateAdapter === 'function'
        ? persistedStateAdapter(nextState)
        : {};
    }

    return updateEditorPersistedDeckState;
  }

  function createStudioEditorPersistedDeckStateGlobalApi(options = {}) {
    const updateEditorPersistedDeckState = typeof options.updateEditorPersistedDeckState === 'function'
      ? options.updateEditorPersistedDeckState
      : null;
    return {
      updateEditorPersistedDeckState: (...args) => updateEditorPersistedDeckState
        ? updateEditorPersistedDeckState(...args)
        : {}
    };
  }

  return {
    createStudioEditorPersistedDeckStateAction,
    createStudioEditorPersistedDeckStateGlobalApi
  };
}));
