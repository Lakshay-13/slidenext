(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorCanonicalVisibility = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function buildStudioCanonicalVisibilityBaseline(options = {}) {
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

    if (!updateCanonicalNodeVisibility || !buildCanonicalDeck) {
      return null;
    }

    return buildCanonicalDeck(options.sourceDocument);
  }

  function buildStudioCanonicalVisibilityDeck(selection, visibilityPatch = {}, options = {}) {
    const sourceSelection = Array.isArray(selection) ? selection : [];
    const canonicalDeckApi = options.canonicalDeckApi && typeof options.canonicalDeckApi === 'object'
      ? options.canonicalDeckApi
      : null;
    const updateCanonicalNodeVisibility = canonicalDeckApi
      && typeof canonicalDeckApi.updateCanonicalNodeVisibility === 'function'
      ? canonicalDeckApi.updateCanonicalNodeVisibility
      : null;
    const canonicalDeckBeforeMutation = Object.prototype.hasOwnProperty.call(options, 'canonicalDeckBeforeMutation')
      ? options.canonicalDeckBeforeMutation
      : buildStudioCanonicalVisibilityBaseline(options);
    const getElementId = typeof options.getElementId === 'function'
      ? options.getElementId
      : (element) => element && element.dataset && element.dataset.editorId;

    if (!updateCanonicalNodeVisibility || sourceSelection.length === 0) {
      return null;
    }

    const nodeIds = sourceSelection.map(getElementId).filter(Boolean);
    return updateCanonicalNodeVisibility(canonicalDeckBeforeMutation, nodeIds, visibilityPatch);
  }

  function buildStudioCanonicalVisibilityMutation(selection, visibilityPatch = {}, options = {}) {
    const canonicalDeckApi = options.canonicalDeckApi && typeof options.canonicalDeckApi === 'object'
      ? options.canonicalDeckApi
      : null;
    const buildCanonicalDeck = typeof options.buildCanonicalDeck === 'function'
      ? options.buildCanonicalDeck
      : null;
    if (!canonicalDeckApi || !buildCanonicalDeck) return null;

    const canonicalDeckBeforeMutation = buildStudioCanonicalVisibilityBaseline({
      canonicalDeckApi,
      buildCanonicalDeck,
      sourceDocument: options.sourceDocument
    });
    return buildStudioCanonicalVisibilityDeck(selection, visibilityPatch, {
      canonicalDeckApi,
      canonicalDeckBeforeMutation,
      getElementId: options.getElementId
    });
  }

  return {
    buildStudioCanonicalVisibilityBaseline,
    buildStudioCanonicalVisibilityDeck,
    buildStudioCanonicalVisibilityMutation
  };
});
