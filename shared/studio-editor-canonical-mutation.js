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

    return function buildStudioEditorMutationCanonicalDeck(sourceDoc) {
      if (!buildCanonicalDeck) return null;
      return buildCanonicalDeck(sourceDoc, {
        preferLiveCanonicalDeck: false
      });
    };
  }

  return {
    createStudioEditorMutationCanonicalDeckBuilder
  };
});
