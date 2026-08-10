(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorPersistedDeckBridge = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function createStudioEditorPersistedDeckBridge(options = {}) {
    const runtimeApi = options.runtimeApi
      || (root && root.SlideNextStudioEditorPersistedDeckRuntime)
      || null;
    const runtime = runtimeApi
      && typeof runtimeApi.createStudioEditorPersistedDeckRuntime === 'function'
      ? runtimeApi.createStudioEditorPersistedDeckRuntime({
          stateStore: options.stateStore
            || (root && root.SlideNextStudioEditorPersistedDeckStateStore)
            || null
        })
      : null;
    const persistedDeckStateStore = runtime
      ? runtime.persistedDeckStateStore
      : null;

    function read(methodName, fallback) {
      return persistedDeckStateStore
        && typeof persistedDeckStateStore[methodName] === 'function'
        ? persistedDeckStateStore[methodName]()
        : fallback;
    }

    function write(methodName, value) {
      return persistedDeckStateStore
        && typeof persistedDeckStateStore[methodName] === 'function'
        ? persistedDeckStateStore[methodName](value)
        : false;
    }

    return {
      runtime,
      persistedDeckStateStore,
      getDeckHtml: () => read('getDeckHtml', ''),
      getCanonicalDeck: () => read('getCanonicalDeck', null),
      getPlaybackState: () => read('getPlaybackState', null),
      setDeckHtml: (nextDeckHtml) => write('setDeckHtml', nextDeckHtml),
      setCanonicalDeck: (nextCanonicalDeck) => write('setCanonicalDeck', nextCanonicalDeck),
      setPlaybackState: (nextPlaybackState) => write('setPlaybackState', nextPlaybackState)
    };
  }

  return {
    createStudioEditorPersistedDeckBridge
  };
});
