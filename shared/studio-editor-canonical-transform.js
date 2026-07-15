(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorCanonicalTransform = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function buildStudioCanonicalTransformDeck(finalizeResult, options = {}) {
    const canonicalDeckApi = options.canonicalDeckApi && typeof options.canonicalDeckApi === 'object'
      ? options.canonicalDeckApi
      : null;
    const updateCanonicalNodeLayout = canonicalDeckApi
      && typeof canonicalDeckApi.updateCanonicalNodeLayout === 'function'
      ? canonicalDeckApi.updateCanonicalNodeLayout
      : null;
    const buildCanonicalLayoutUpdates = typeof options.buildCanonicalLayoutUpdates === 'function'
      ? options.buildCanonicalLayoutUpdates
      : null;
    const buildCanonicalDeck = typeof options.buildCanonicalDeck === 'function'
      ? options.buildCanonicalDeck
      : null;

    if (!updateCanonicalNodeLayout || !buildCanonicalLayoutUpdates || !buildCanonicalDeck) {
      return null;
    }

    const layoutUpdates = buildCanonicalLayoutUpdates(finalizeResult, {
      getElementId: options.getElementId
    });
    return updateCanonicalNodeLayout(buildCanonicalDeck(), layoutUpdates);
  }

  return {
    buildStudioCanonicalTransformDeck
  };
});
