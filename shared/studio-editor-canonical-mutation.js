(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorCanonicalMutation = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function createStudioEditorMutationCanonicalDeckBuilder(options = {}) {
    const buildCanonicalDeck = typeof options.buildCanonicalDeck === 'function'
      ? options.buildCanonicalDeck
      : null;
    const getCanonicalDeckBaseline = typeof options.getCanonicalDeckBaseline === 'function'
      ? options.getCanonicalDeckBaseline
      : null;
    const isCanonicalDeck = typeof options.isCanonicalDeck === 'function'
      ? options.isCanonicalDeck
      : null;
    const canonicalStateApi = options.canonicalStateApi
      || (root && root.SlideNextStudioEditorCanonicalState)
      || null;
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
            if (!liveCanonicalDeck) return null;
            if (isCanonicalDeck && isCanonicalDeck(liveCanonicalDeck) !== true) return null;
            return liveCanonicalDeck;
          } catch (err) {
            return null;
          }
        };

    return function buildStudioEditorMutationCanonicalDeck(sourceDoc) {
      if (!buildCanonicalDeck) return null;
      const buildOptions = {
        preferLiveCanonicalDeck: false
      };
      const canonicalDeckBaseline = readCanonicalDeckBaseline(sourceDoc);
      if (canonicalDeckBaseline) {
        buildOptions.canonicalDeckBaseline = canonicalDeckBaseline;
      }
      return buildCanonicalDeck(sourceDoc, buildOptions);
    };
  }

  return {
    createStudioEditorMutationCanonicalDeckBuilder
  };
});
