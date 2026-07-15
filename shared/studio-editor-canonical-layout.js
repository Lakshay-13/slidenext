(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorCanonicalLayout = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function buildStudioCanonicalLayoutDeck(layoutUpdates, options = {}) {
    const canonicalDeckApi = options.canonicalDeckApi && typeof options.canonicalDeckApi === 'object'
      ? options.canonicalDeckApi
      : null;
    const updateCanonicalNodeLayout = canonicalDeckApi
      && typeof canonicalDeckApi.updateCanonicalNodeLayout === 'function'
      ? canonicalDeckApi.updateCanonicalNodeLayout
      : null;
    const buildCanonicalDeck = typeof options.buildCanonicalDeck === 'function'
      ? options.buildCanonicalDeck
      : null;
    const canonicalDeckBeforeMutation = Object.prototype.hasOwnProperty.call(options, 'canonicalDeckBeforeMutation')
      ? options.canonicalDeckBeforeMutation
      : (buildCanonicalDeck ? buildCanonicalDeck() : null);

    if (!updateCanonicalNodeLayout) {
      return null;
    }

    return updateCanonicalNodeLayout(canonicalDeckBeforeMutation, Array.isArray(layoutUpdates) ? layoutUpdates : []);
  }

  return {
    buildStudioCanonicalLayoutDeck
  };
});
