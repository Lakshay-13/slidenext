(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorDeckReadyRuntime = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function createStudioEditorDeckReadyRuntime(options = {}) {
    const controllerApi = options.controllerApi
      || (root && root.SlideNextStudioEditorDeckReadyController)
      || null;
    const deckReadyController = controllerApi
      && typeof controllerApi.createStudioEditorDeckReadyController === 'function'
      ? controllerApi.createStudioEditorDeckReadyController({
          deckReadyApi: options.deckReadyApi
            || (root && root.SlideNextStudioDeckReady)
            || null,
          getDocumentRef: options.getDocumentRef,
          getDocument: options.getDocument,
          getPresentationUrl: options.getPresentationUrl,
          getPersistedDeckState: options.getPersistedDeckState,
          resolvePersistedDeckStateWithContent: options.resolvePersistedDeckStateWithContent,
          getStoredCanonicalDeck: options.getStoredCanonicalDeck,
          getSaveButtonState: options.getSaveButtonState
        })
      : null;

    return {
      deckReadyController
    };
  }

  return {
    createStudioEditorDeckReadyRuntime
  };
});
