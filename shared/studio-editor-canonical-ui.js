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
    const validateCanonicalDeck = typeof options.isCanonicalDeck === 'function'
      ? options.isCanonicalDeck
      : null;
    const isValidCanonicalDeck = (value) => {
      if (!value) return false;
      if (!validateCanonicalDeck) return true;
      try {
        return validateCanonicalDeck(value) === true;
      } catch (error) {
        return false;
      }
    };
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

    if (isValidCanonicalDeck(liveCanonicalDeck)) return liveCanonicalDeck;
    if (typeof options.buildCanonicalDeck !== 'function') return null;
    let rebuiltCanonicalDeck = null;
    try {
      rebuiltCanonicalDeck = options.buildCanonicalDeck(sourceDoc);
    } catch (error) {
      return null;
    }
    return isValidCanonicalDeck(rebuiltCanonicalDeck) ? rebuiltCanonicalDeck : null;
  }

  return {
    resolveStudioEditorCanonicalDeck
  };
});
