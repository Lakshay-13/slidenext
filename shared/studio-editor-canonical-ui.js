(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorCanonicalUi = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function resolveStudioEditorCanonicalDeck(sourceDoc = null, options = {}) {
    const resolveLiveCanonicalDeck = typeof options.resolveLiveCanonicalDeck === 'function'
      ? options.resolveLiveCanonicalDeck
      : null;
    let liveCanonicalDeck = null;

    if (resolveLiveCanonicalDeck) {
      try {
        const sessionToken = typeof options.getSessionToken === 'function'
          ? options.getSessionToken()
          : options.sessionToken || null;
        liveCanonicalDeck = resolveLiveCanonicalDeck(sourceDoc, sessionToken);
      } catch (error) {
        liveCanonicalDeck = null;
      }
    }

    if (liveCanonicalDeck) return liveCanonicalDeck;
    return typeof options.buildCanonicalDeck === 'function'
      ? options.buildCanonicalDeck(sourceDoc)
      : null;
  }

  return {
    resolveStudioEditorCanonicalDeck
  };
});
