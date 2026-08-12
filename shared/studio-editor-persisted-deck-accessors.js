(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorPersistedDeckAccessors = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function createStudioEditorPersistedDeckAccessors(options = {}) {
    const bridge = options.bridge || null;

    function read(methodName, fallback) {
      return bridge && typeof bridge[methodName] === 'function'
        ? bridge[methodName]()
        : fallback;
    }

    function write(methodName, value) {
      return bridge && typeof bridge[methodName] === 'function'
        ? bridge[methodName](value)
        : false;
    }

    return {
      bridge,
      getDeckHtml: () => read('getDeckHtml', ''),
      getCanonicalDeck: () => read('getCanonicalDeck', null),
      getPlaybackState: () => read('getPlaybackState', null),
      setDeckHtml: (nextDeckHtml) => write('setDeckHtml', nextDeckHtml),
      setCanonicalDeck: (nextCanonicalDeck) => write('setCanonicalDeck', nextCanonicalDeck),
      setPlaybackState: (nextPlaybackState) => write('setPlaybackState', nextPlaybackState)
    };
  }

  function createStudioEditorPersistedDeckGlobalApi(options = {}) {
    const accessors = options.accessors || createStudioEditorPersistedDeckAccessors(options);

    return {
      getStudioPersistedDeckHtml: () => accessors.getDeckHtml(),
      getStudioPersistedCanonicalDeck: () => accessors.getCanonicalDeck(),
      getStudioPersistedPlaybackState: () => accessors.getPlaybackState(),
      setStudioPersistedDeckHtml: (nextDeckHtml) => accessors.setDeckHtml(nextDeckHtml),
      setStudioPersistedCanonicalDeck: (nextCanonicalDeck) => accessors
        .setCanonicalDeck(nextCanonicalDeck),
      setStudioPersistedPlaybackState: (nextPlaybackState) => accessors
        .setPlaybackState(nextPlaybackState)
    };
  }

  return {
    createStudioEditorPersistedDeckAccessors,
    createStudioEditorPersistedDeckGlobalApi
  };
});
