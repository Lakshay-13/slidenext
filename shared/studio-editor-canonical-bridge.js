(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorCanonicalBridge = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function createStudioEditorCanonicalBridge(options = {}) {
    const state = options.state && typeof options.state === 'object'
      ? options.state
      : null;
    const canonicalDeckBuilder = typeof options.canonicalDeckBuilder === 'function'
      ? options.canonicalDeckBuilder
      : null;
    const mutationCanonicalDeckBuilder = typeof options.mutationCanonicalDeckBuilder === 'function'
      ? options.mutationCanonicalDeckBuilder
      : null;
    const getDocument = typeof options.getDocument === 'function'
      ? options.getDocument
      : () => null;
    const getCanonicalDeckBaseline = typeof options.getCanonicalDeckBaseline === 'function'
      ? options.getCanonicalDeckBaseline
      : null;

    function resetLiveCanonicalDeck() {
      if (!state || typeof state.reset !== 'function') return null;
      return state.reset();
    }

    function setLiveCanonicalDeck(canonicalDeck, documentRef = null, sessionToken = null) {
      if (!state || typeof state.set !== 'function') return null;
      return state.set(canonicalDeck, {
        documentRef,
        sessionToken
      });
    }

    function resolveLiveCanonicalDeck(documentRef = null, sessionToken = null) {
      if (!state || typeof state.resolve !== 'function') return null;
      return state.resolve({
        documentRef,
        sessionToken
      });
    }

    function buildCanonicalDeck(documentRef = getDocument(), buildOptions = {}) {
      if (!canonicalDeckBuilder) return null;
      const normalizedOptions = arguments.length > 1
        && arguments[1]
        && typeof arguments[1] === 'object'
        ? arguments[1]
        : {};
      let resolvedOptions = normalizedOptions;
      if (normalizedOptions.preferLiveCanonicalDeck === false
        && !Object.prototype.hasOwnProperty.call(normalizedOptions, 'canonicalDeckBaseline')
        && getCanonicalDeckBaseline) {
        let canonicalDeckBaseline = null;
        try {
          canonicalDeckBaseline = getCanonicalDeckBaseline(documentRef);
        } catch (err) {
          canonicalDeckBaseline = null;
        }
        if (canonicalDeckBaseline) {
          resolvedOptions = {
            ...normalizedOptions,
            canonicalDeckBaseline
          };
        }
      }
      try {
        return canonicalDeckBuilder(documentRef, resolvedOptions);
      } catch (err) {
        // Keep legacy HTML editing available when canonical import cannot proceed.
        return null;
      }
    }

    function buildMutationCanonicalDeck(sourceDoc) {
      if (!mutationCanonicalDeckBuilder) return null;
      try {
        return mutationCanonicalDeckBuilder(sourceDoc);
      } catch (err) {
        return null;
      }
    }

    return {
      resetLiveCanonicalDeck,
      setLiveCanonicalDeck,
      resolveLiveCanonicalDeck,
      buildCanonicalDeck,
      buildMutationCanonicalDeck
    };
  }

  return {
    createStudioEditorCanonicalBridge
  };
});
