(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorCanonicalBridge = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
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
    const isCanonicalDeck = typeof options.isCanonicalDeck === 'function'
      ? options.isCanonicalDeck
      : null;
    const canonicalStateApi = options.canonicalStateApi
      || (root && root.SlideNextStudioEditorCanonicalState)
      || null;
    function isValidCanonicalDeck(value) {
      if (!value) return false;
      if (typeof isCanonicalDeck !== 'function') return true;
      try {
        return isCanonicalDeck(value) === true;
      } catch (err) {
        return false;
      }
    }
    const readCanonicalDeckBaseline = canonicalStateApi
      && typeof canonicalStateApi.createStudioEditorCanonicalDeckBaselineReader === 'function'
      ? canonicalStateApi.createStudioEditorCanonicalDeckBaselineReader({
          getCanonicalDeckBaseline,
          isCanonicalDeck
        })
      : (sourceDocument) => {
          if (!getCanonicalDeckBaseline) return null;
          try {
            const liveCanonicalDeck = getCanonicalDeckBaseline(sourceDocument);
            return isValidCanonicalDeck(liveCanonicalDeck) ? liveCanonicalDeck : null;
          } catch (err) {
            return null;
          }
        };

    function resetLiveCanonicalDeck() {
      if (!state || typeof state.reset !== 'function') return null;
      return state.reset();
    }

    function setLiveCanonicalDeck(canonicalDeck, documentRef = null, sessionToken = null) {
      if (!state || typeof state.set !== 'function' || !isValidCanonicalDeck(canonicalDeck)) return null;
      return state.set(canonicalDeck, {
        documentRef,
        sessionToken
      });
    }

    function resolveLiveCanonicalDeck(documentRef = null, sessionToken = null) {
      if (!state || typeof state.resolve !== 'function') return null;
      const canonicalDeck = state.resolve({
        documentRef,
        sessionToken
      });
      return isValidCanonicalDeck(canonicalDeck) ? canonicalDeck : null;
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
        const canonicalDeckBaseline = readCanonicalDeckBaseline(documentRef);
        if (canonicalDeckBaseline) {
          resolvedOptions = {
            ...normalizedOptions,
            canonicalDeckBaseline
          };
        }
      }
      try {
        const canonicalDeck = canonicalDeckBuilder(documentRef, resolvedOptions);
        return isValidCanonicalDeck(canonicalDeck) ? canonicalDeck : null;
      } catch (err) {
        // Keep legacy HTML editing available when canonical import cannot proceed.
        return null;
      }
    }

    function buildMutationCanonicalDeck(sourceDoc) {
      if (!mutationCanonicalDeckBuilder) return null;
      try {
        const canonicalDeck = mutationCanonicalDeckBuilder(sourceDoc);
        return isValidCanonicalDeck(canonicalDeck) ? canonicalDeck : null;
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
