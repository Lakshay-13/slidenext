(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorCanonicalMutation = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function createStudioEditorMutationCanonicalDeckBuilder(options = {}) {
    const buildCanonicalDeck = typeof options.buildCanonicalDeck === 'function'
      ? options.buildCanonicalDeck
      : null;
    const getCanonicalDeckBaseline = typeof options.getCanonicalDeckBaseline === 'function'
      ? options.getCanonicalDeckBaseline
      : null;

    return function buildStudioEditorMutationCanonicalDeck(sourceDoc) {
      if (!buildCanonicalDeck) return null;
      const buildOptions = {
        preferLiveCanonicalDeck: false
      };
      if (getCanonicalDeckBaseline) {
        let canonicalDeckBaseline = null;
        try {
          canonicalDeckBaseline = getCanonicalDeckBaseline(sourceDoc);
        } catch (err) {
          canonicalDeckBaseline = null;
        }
        if (canonicalDeckBaseline) {
          buildOptions.canonicalDeckBaseline = canonicalDeckBaseline;
        }
      }
      return buildCanonicalDeck(sourceDoc, buildOptions);
    };
  }

  return {
    createStudioEditorMutationCanonicalDeckBuilder
  };
});
