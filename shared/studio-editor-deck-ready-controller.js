(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorDeckReadyController = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function createStudioEditorDeckReadyController(options = {}) {
    const deckReadyApi = options.deckReadyApi
      || (root && root.SlideNextStudioDeckReady)
      || null;
    const resolveDocumentRef = typeof options.getDocumentRef === 'function'
      ? options.getDocumentRef
      : () => options.documentRef || null;
    const getDocument = typeof options.getDocument === 'function'
      ? options.getDocument
      : () => null;
    const getPresentationUrl = typeof options.getPresentationUrl === 'function'
      ? options.getPresentationUrl
      : () => '';
    const getPersistedDeckState = typeof options.getPersistedDeckState === 'function'
      ? options.getPersistedDeckState
      : () => null;
    const resolvePersistedDeckStateWithContent = typeof options.resolvePersistedDeckStateWithContent === 'function'
      ? options.resolvePersistedDeckStateWithContent
      : (persistedDeckState) => persistedDeckState;
    const getStoredCanonicalDeck = typeof options.getStoredCanonicalDeck === 'function'
      ? options.getStoredCanonicalDeck
      : () => null;
    const getSaveButtonState = typeof options.getSaveButtonState === 'function'
      ? options.getSaveButtonState
      : () => 'idle';

    function buildReadyOptions(doc) {
      const persistedDeckState = getPersistedDeckState();
      return {
        doc,
        presentationUrl: getPresentationUrl(),
        persistedDeckStateWithContent: resolvePersistedDeckStateWithContent(persistedDeckState),
        storedCanonicalDeck: getStoredCanonicalDeck(),
        saveButtonState: getSaveButtonState()
      };
    }

    function resolve(doc = getDocument()) {
      if (!deckReadyApi || typeof deckReadyApi.resolveStudioDeckReadyActionState !== 'function') {
        return {
          canUseSaveButton: false,
          canUseDeckActions: false,
          canLaunchPreview: false
        };
      }
      return deckReadyApi.resolveStudioDeckReadyActionState(buildReadyOptions(doc));
    }

    function update(doc = getDocument()) {
      if (!deckReadyApi || typeof deckReadyApi.syncStudioDeckReadyToolbarActionState !== 'function') {
        return false;
      }
      return deckReadyApi.syncStudioDeckReadyToolbarActionState({
        documentRef: resolveDocumentRef(),
        ...buildReadyOptions(doc)
      });
    }

    return {
      resolve,
      update
    };
  }

  return {
    createStudioEditorDeckReadyController
  };
});
