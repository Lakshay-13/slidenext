(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorPersistenceState = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function createStudioEditorPersistedDeckStateAdapter(options = {}) {
    const persistenceApi = options.persistenceApi && typeof options.persistenceApi === 'object'
      ? options.persistenceApi
      : null;
    const resolveCanonicalDeck = typeof options.resolveCanonicalDeck === 'function'
      ? options.resolveCanonicalDeck
      : () => null;
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

    let stateUpdater = null;

    function createStateUpdater() {
      if (!persistenceApi || typeof persistenceApi.createStudioPersistedDeckStateUpdater !== 'function') {
        return null;
      }
      return persistenceApi.createStudioPersistedDeckStateUpdater({
        resolveCanonicalDeck,
        normalizePlaybackState,
        setPersistedDeckHtml,
        setPersistedCanonicalDeck,
        setPersistedPlaybackState
      });
    }

    return function updateEditorPersistedDeckState(nextState = {}) {
      if (!stateUpdater) {
        stateUpdater = createStateUpdater();
      }
      if (typeof stateUpdater !== 'function') return {};
      return stateUpdater(nextState);
    };
  }

  function createStudioEditorPersistedDeckStateApplierAdapter(options = {}) {
    const persistenceApi = options.persistenceApi && typeof options.persistenceApi === 'object'
      ? options.persistenceApi
      : null;
    const currentPresentationUrl = typeof options.currentPresentationUrl === 'string'
      ? options.currentPresentationUrl
      : '';
    const updatePersistedDeckState = typeof options.updatePersistedDeckState === 'function'
      ? options.updatePersistedDeckState
      : () => {};
    const setCurrentPresentationCanonicalDeck = typeof options.setCurrentPresentationCanonicalDeck === 'function'
      ? options.setCurrentPresentationCanonicalDeck
      : () => {};

    let stateApplier = null;

    function createStateApplier() {
      if (!persistenceApi || typeof persistenceApi.createStudioPersistedDeckStateApplier !== 'function') {
        return null;
      }
      return persistenceApi.createStudioPersistedDeckStateApplier({
        currentPresentationUrl,
        updatePersistedDeckState,
        setCurrentPresentationCanonicalDeck
      });
    }

    return function applyEditorPersistedDeckState(nextState = {}, nextOptions = {}) {
      if (!stateApplier) {
        stateApplier = createStateApplier();
      }
      if (typeof stateApplier !== 'function') return nextState;
      return stateApplier(nextState, nextOptions);
    };
  }

  return {
    createStudioEditorPersistedDeckStateAdapter,
    createStudioEditorPersistedDeckStateApplierAdapter
  };
});
