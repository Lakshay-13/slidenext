(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorPersistenceController = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function createStudioEditorPersistenceController(options = {}) {
    const hasOption = (name) => Object.prototype.hasOwnProperty.call(options, name);
    const resolveDependency = (name, globalName) => hasOption(name)
      ? options[name]
      : (root && root[globalName]) || null;
    const persistenceApi = resolveDependency(
      'persistenceApi',
      'SlideNextStudioEditorPersistence'
    );
    const persistenceStateApi = resolveDependency(
      'persistenceStateApi',
      'SlideNextStudioEditorPersistenceState'
    );
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
      if (!persistenceStateApi
        || typeof persistenceStateApi.createStudioEditorPersistedDeckStateAdapter !== 'function') {
        return null;
      }
      return persistenceStateApi.createStudioEditorPersistedDeckStateAdapter({
        persistenceApi,
        resolveCanonicalDeck,
        normalizePlaybackState,
        setPersistedDeckHtml,
        setPersistedCanonicalDeck,
        setPersistedPlaybackState
      });
    }

    function update(nextState = {}) {
      if (typeof stateUpdater !== 'function') {
        stateUpdater = createStateUpdater();
      }
      return typeof stateUpdater === 'function' ? stateUpdater(nextState) : {};
    }

    return { update };
  }

  return {
    createStudioEditorPersistenceController
  };
});
