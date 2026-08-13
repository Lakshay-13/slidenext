(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorCanonicalMutation = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function isCanonicalDeckLike(value) {
    return !!value
      && typeof value === 'object'
      && !Array.isArray(value)
      && Array.isArray(value.slides);
  }

  function createStudioEditorMutationCanonicalDeckBuilder(options = {}) {
    const buildCanonicalDeck = typeof options.buildCanonicalDeck === 'function'
      ? options.buildCanonicalDeck
      : null;
    const getCanonicalDeckBaseline = typeof options.getCanonicalDeckBaseline === 'function'
      ? options.getCanonicalDeckBaseline
      : null;
    const getPendingCanonicalDeck = typeof options.getPendingCanonicalDeck === 'function'
      ? options.getPendingCanonicalDeck
      : null;
    const isCanonicalDeck = typeof options.isCanonicalDeck === 'function'
      ? options.isCanonicalDeck
      : null;
    const canonicalStateApi = options.canonicalStateApi
      || (root && root.SlideNextStudioEditorCanonicalState)
      || null;

    function isValidCanonicalDeck(value) {
      if (!value) return false;
      const validate = isCanonicalDeck || isCanonicalDeckLike;
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
            getPendingCanonicalDeck,
            getCanonicalDeckBaseline,
            isCanonicalDeck
          });
          return typeof sharedReader === 'function' ? sharedReader : () => null;
        })()
      : (sourceDocument) => {
          if (getPendingCanonicalDeck) {
            try {
              const pendingCanonicalDeck = getPendingCanonicalDeck(sourceDocument);
              if (isValidCanonicalDeck(pendingCanonicalDeck)) return pendingCanonicalDeck;
            } catch (err) {
              // Fall through to the live baseline path.
            }
          }
          if (!getCanonicalDeckBaseline) return null;
          try {
            const liveCanonicalDeck = getCanonicalDeckBaseline(sourceDocument);
            return isValidCanonicalDeck(liveCanonicalDeck)
              ? liveCanonicalDeck
              : null;
          } catch (err) {
            return null;
          }
        };

    return function buildStudioEditorMutationCanonicalDeck(sourceDoc, requestedOptions = {}) {
      if (!buildCanonicalDeck) return null;
      const normalizedOptions = requestedOptions
        && typeof requestedOptions === 'object'
        && !Array.isArray(requestedOptions)
        ? requestedOptions
        : {};
      const buildOptions = {
        ...normalizedOptions,
        preferLiveCanonicalDeck: false
      };
      const hasValidProvidedBaseline = Object.prototype.hasOwnProperty.call(
        buildOptions,
        'canonicalDeckBaseline'
      ) && isValidCanonicalDeck(buildOptions.canonicalDeckBaseline);
      if (!hasValidProvidedBaseline) {
        const canonicalDeckBaseline = readCanonicalDeckBaseline(sourceDoc);
        if (canonicalDeckBaseline) {
          buildOptions.canonicalDeckBaseline = canonicalDeckBaseline;
        }
      }
      try {
        const rebuiltCanonicalDeck = buildCanonicalDeck(sourceDoc, buildOptions);
        return isValidCanonicalDeck(rebuiltCanonicalDeck)
          ? rebuiltCanonicalDeck
          : null;
      } catch (err) {
        return null;
      }
    };
  }

  return {
    createStudioEditorMutationCanonicalDeckBuilder
  };
});
