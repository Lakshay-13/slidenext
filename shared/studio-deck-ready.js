(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioDeckReady = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function resolveStudioDeckReadyActionState(options = {}) {
    const hasDeckDocument = !!(options.doc && options.doc.documentElement);
    const hasPresentationSession = typeof options.presentationUrl === 'string' && !!options.presentationUrl;
    const hasPersistedDeckContent = !!options.persistedDeckStateWithContent;
    const hasStoredCanonicalDeck = !!options.storedCanonicalDeck;
    const hasDeckContent = hasDeckDocument || hasPersistedDeckContent || hasStoredCanonicalDeck;

    return {
      hasDeckDocument,
      hasPresentationSession,
      hasPersistedDeckContent,
      hasStoredCanonicalDeck,
      hasDeckContent,
      canUseDeckActions: hasPresentationSession && hasDeckContent,
      canLaunchPreview: hasPresentationSession
    };
  }

  return {
    resolveStudioDeckReadyActionState
  };
});
