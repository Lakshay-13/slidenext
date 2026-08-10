(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorCanonicalBridge = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function isCanonicalDeckLike(value) {
    return !!value
      && typeof value === 'object'
      && !Array.isArray(value)
      && Array.isArray(value.slides);
  }

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
    const canonicalDeckLikeValidator = canonicalStateApi
      && typeof canonicalStateApi.isStudioEditorCanonicalDeckLike === 'function'
      ? canonicalStateApi.isStudioEditorCanonicalDeckLike
      : isCanonicalDeckLike;
    function isValidCanonicalDeck(value) {
      if (!value) return false;
      const validate = typeof isCanonicalDeck === 'function'
        ? isCanonicalDeck
        : canonicalDeckLikeValidator;
      try {
        return validate(value) === true;
      } catch (err) {
        return false;
      }
    }
    const createCanonicalDeckBaselineReader = canonicalStateApi
      && typeof canonicalStateApi.createStudioEditorCanonicalDeckBaselineReader === 'function'
      ? canonicalStateApi.createStudioEditorCanonicalDeckBaselineReader
      : null;
    const readCanonicalDeckBaseline = createCanonicalDeckBaselineReader
      ? (() => {
          const sharedReader = createCanonicalDeckBaselineReader({
            getCanonicalDeckBaseline,
            isCanonicalDeck
          });
          return typeof sharedReader === 'function' ? sharedReader : () => null;
        })()
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
      try {
        return state.reset();
      } catch (error) {
        return null;
      }
    }

    function setLiveCanonicalDeck(canonicalDeck, documentRef = null, sessionToken = null) {
      if (!state) return null;
      if (canonicalDeck === null || typeof canonicalDeck === 'undefined') {
        if (typeof state.clear === 'function') {
          try {
            return state.clear({
              documentRef,
              sessionToken
            });
          } catch (error) {
            return null;
          }
        }
        return resetLiveCanonicalDeck();
      }
      if (typeof state.set !== 'function' || !isValidCanonicalDeck(canonicalDeck)) return null;
      try {
        return state.set(canonicalDeck, {
          documentRef,
          sessionToken
        });
      } catch (error) {
        return null;
      }
    }

    function resolveLiveCanonicalDeck(documentRef = null, sessionToken = null) {
      if (!state || typeof state.resolve !== 'function') return null;
      let canonicalDeck = null;
      try {
        canonicalDeck = state.resolve({
          documentRef,
          sessionToken
        });
      } catch (error) {
        return null;
      }
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
