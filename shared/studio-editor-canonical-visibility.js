(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorCanonicalVisibility = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function buildStudioCanonicalVisibilityDeck(selection, visibilityPatch = {}, options = {}) {
    const sourceSelection = Array.isArray(selection) ? selection : [];
    const canonicalDeckApi = options.canonicalDeckApi && typeof options.canonicalDeckApi === 'object'
      ? options.canonicalDeckApi
      : null;
    const updateCanonicalNodeVisibility = canonicalDeckApi
      && typeof canonicalDeckApi.updateCanonicalNodeVisibility === 'function'
      ? canonicalDeckApi.updateCanonicalNodeVisibility
      : null;
    const buildCanonicalDeck = typeof options.buildCanonicalDeck === 'function'
      ? options.buildCanonicalDeck
      : null;
    const getElementId = typeof options.getElementId === 'function'
      ? options.getElementId
      : (element) => element && element.dataset && element.dataset.editorId;

    if (!updateCanonicalNodeVisibility || sourceSelection.length === 0) {
      return null;
    }

    const nodeIds = sourceSelection.map(getElementId).filter(Boolean);
    const canonicalDeckBeforeMutation = buildCanonicalDeck
      ? buildCanonicalDeck()
      : null;
    return updateCanonicalNodeVisibility(canonicalDeckBeforeMutation, nodeIds, visibilityPatch);
  }

  return {
    buildStudioCanonicalVisibilityDeck
  };
});
