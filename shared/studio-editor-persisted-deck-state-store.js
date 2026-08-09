(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorPersistedDeckStateStore = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function resolveController(options = {}) {
    if (options.stateController && typeof options.stateController === 'object') {
      return options.stateController;
    }

    const controllerApi = root && root.SlideNextStudioEditorPersistedDeckStateController;
    if (!controllerApi
      || typeof controllerApi.createStudioEditorPersistedDeckStateController !== 'function') {
      return null;
    }

    return controllerApi.createStudioEditorPersistedDeckStateController({});
  }

  function createStudioEditorPersistedDeckStateStore(options = {}) {
    const controller = resolveController(options);

    function getDeckHtml() {
      return controller && typeof controller.getDeckHtml === 'function'
        ? controller.getDeckHtml()
        : '';
    }

    function getCanonicalDeck() {
      return controller && typeof controller.getCanonicalDeck === 'function'
        ? controller.getCanonicalDeck()
        : null;
    }

    function getPlaybackState() {
      return controller && typeof controller.getPlaybackState === 'function'
        ? controller.getPlaybackState()
        : null;
    }

    function setDeckHtml(nextDeckHtml) {
      return controller && typeof controller.setDeckHtml === 'function'
        ? controller.setDeckHtml(nextDeckHtml)
        : false;
    }

    function setCanonicalDeck(nextCanonicalDeck) {
      return controller && typeof controller.setCanonicalDeck === 'function'
        ? controller.setCanonicalDeck(nextCanonicalDeck)
        : false;
    }

    function setPlaybackState(nextPlaybackState) {
      return controller && typeof controller.setPlaybackState === 'function'
        ? controller.setPlaybackState(nextPlaybackState)
        : false;
    }

    return {
      getDeckHtml,
      getCanonicalDeck,
      getPlaybackState,
      setDeckHtml,
      setCanonicalDeck,
      setPlaybackState
    };
  }

  return {
    createStudioEditorPersistedDeckStateStore
  };
});
