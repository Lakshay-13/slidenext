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
    const currentPresentationUrl = typeof options.currentPresentationUrl === 'string'
      ? options.currentPresentationUrl
      : '';
    const getCurrentPresentationUrl = typeof options.getCurrentPresentationUrl === 'function'
      ? options.getCurrentPresentationUrl
      : () => currentPresentationUrl;
    const setCurrentPresentationCanonicalDeck = typeof options.setCurrentPresentationCanonicalDeck === 'function'
      ? options.setCurrentPresentationCanonicalDeck
      : () => {};
    const isCanonicalDeck = typeof options.isCanonicalDeck === 'function'
      ? options.isCanonicalDeck
      : null;
    const getPersistedDeckHtml = typeof options.getPersistedDeckHtml === 'function'
      ? options.getPersistedDeckHtml
      : () => options.persistedDeckHtml;
    const getPersistedCanonicalDeck = typeof options.getPersistedCanonicalDeck === 'function'
      ? options.getPersistedCanonicalDeck
      : () => options.persistedCanonicalDeck;
    const getPersistedPlaybackState = typeof options.getPersistedPlaybackState === 'function'
      ? options.getPersistedPlaybackState
      : () => options.persistedPlaybackState;

    let stateUpdater = null;
    let stateApplier = null;
    let stateReader = null;
    let canonicalDeckOverrideResolver = null;
    let fallbackCanonicalDeckResolver = null;

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

    function createStateReader() {
      if (!persistenceStateApi
        || typeof persistenceStateApi.createStudioEditorPersistedDeckStateReaderAdapter !== 'function') {
        return null;
      }
      return persistenceStateApi.createStudioEditorPersistedDeckStateReaderAdapter({
        persistenceApi,
        getPersistedDeckHtml,
        getPersistedCanonicalDeck,
        getPersistedPlaybackState
      });
    }

    function read() {
      if (typeof stateReader !== 'function') {
        stateReader = createStateReader();
      }
      return typeof stateReader === 'function'
        ? stateReader()
        : {
            cleanHtml: '',
            canonicalDeck: null,
            playbackState: null
          };
    }

    function resolveWithContent(persistedDeckState = read()) {
      if (typeof stateReader !== 'function') {
        read();
      }
      return stateReader
        && typeof stateReader.resolveWithContent === 'function'
        ? stateReader.resolveWithContent(persistedDeckState)
        : null;
    }

    function resolvePersistedDeckStateWithContent(persistedDeckState = read()) {
      if (typeof stateReader !== 'function') {
        read();
      }
      return stateReader
        && typeof stateReader.resolvePersistedDeckStateWithContent === 'function'
        ? stateReader.resolvePersistedDeckStateWithContent(persistedDeckState)
        : null;
    }

    function createStateApplier() {
      if (!persistenceStateApi
        || typeof persistenceStateApi.createStudioEditorPersistedDeckStateApplierAdapter !== 'function') {
        return null;
      }
      return persistenceStateApi.createStudioEditorPersistedDeckStateApplierAdapter({
        persistenceApi,
        currentPresentationUrl,
        getCurrentPresentationUrl,
        updatePersistedDeckState: update,
        setCurrentPresentationCanonicalDeck
      });
    }

    function apply(nextState = {}, nextOptions = {}) {
      if (typeof stateApplier !== 'function') {
        stateApplier = createStateApplier();
      }
      return typeof stateApplier === 'function' ? stateApplier(nextState, nextOptions) : nextState;
    }

    function createCanonicalDeckOverrideResolver() {
      if (!persistenceStateApi
        || typeof persistenceStateApi.createStudioEditorCanonicalDeckOverrideAdapter !== 'function') {
        return null;
      }
      return persistenceStateApi.createStudioEditorCanonicalDeckOverrideAdapter({
        persistenceApi,
        isCanonicalDeck
      });
    }

    function resolveCanonicalDeckOverride(canonicalDeck = null, nextOptions = {}) {
      if (typeof canonicalDeckOverrideResolver !== 'function') {
        canonicalDeckOverrideResolver = createCanonicalDeckOverrideResolver();
      }
      return typeof canonicalDeckOverrideResolver === 'function'
        ? canonicalDeckOverrideResolver(canonicalDeck, nextOptions)
        : null;
    }

    function createFallbackCanonicalDeckResolver() {
      if (!persistenceStateApi
        || typeof persistenceStateApi.createStudioEditorFallbackCanonicalDeckAdapter !== 'function') {
        return null;
      }
      return persistenceStateApi.createStudioEditorFallbackCanonicalDeckAdapter({
        persistenceApi,
        isCanonicalDeck
      });
    }

    function resolveFallbackCanonicalDeck(canonicalDeck = null, nextOptions = {}) {
      if (typeof fallbackCanonicalDeckResolver !== 'function') {
        fallbackCanonicalDeckResolver = createFallbackCanonicalDeckResolver();
      }
      return typeof fallbackCanonicalDeckResolver === 'function'
        ? fallbackCanonicalDeckResolver(canonicalDeck, nextOptions)
        : null;
    }

    return {
      read,
      resolveWithContent,
      resolvePersistedDeckStateWithContent,
      update,
      apply,
      resolveCanonicalDeckOverride,
      resolveFallbackCanonicalDeck
    };
  }

  return {
    createStudioEditorPersistenceController
  };
});
