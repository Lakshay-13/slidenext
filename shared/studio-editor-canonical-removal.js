(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorCanonicalRemoval = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function buildStudioCanonicalRemovalBaseline(options = {}) {
    const canonicalDeckApi = options.canonicalDeckApi && typeof options.canonicalDeckApi === 'object'
      ? options.canonicalDeckApi
      : null;
    const removeCanonicalNodes = canonicalDeckApi
      && typeof canonicalDeckApi.removeCanonicalNodes === 'function'
      ? canonicalDeckApi.removeCanonicalNodes
      : null;
    const buildCanonicalDeck = typeof options.buildCanonicalDeck === 'function'
      ? options.buildCanonicalDeck
      : null;

    if (!removeCanonicalNodes || !buildCanonicalDeck) {
      return null;
    }

    return buildCanonicalDeck(options.sourceDocument);
  }

  function buildStudioCanonicalRemovalDeck(selection, options = {}) {
    const sourceSelection = Array.isArray(selection) ? selection : [];
    const canonicalDeckApi = options.canonicalDeckApi && typeof options.canonicalDeckApi === 'object'
      ? options.canonicalDeckApi
      : null;
    const removeCanonicalNodes = canonicalDeckApi
      && typeof canonicalDeckApi.removeCanonicalNodes === 'function'
      ? canonicalDeckApi.removeCanonicalNodes
      : null;
    const canonicalDeckBeforeMutation = Object.prototype.hasOwnProperty.call(options, 'canonicalDeckBeforeMutation')
      ? options.canonicalDeckBeforeMutation
      : buildStudioCanonicalRemovalBaseline(options);
    const getElementId = typeof options.getElementId === 'function'
      ? options.getElementId
      : (element) => element && element.dataset && element.dataset.editorId;

    if (!removeCanonicalNodes || !canonicalDeckBeforeMutation || sourceSelection.length === 0) {
      return null;
    }

    const nodeIds = sourceSelection.map(getElementId).filter(Boolean);
    return removeCanonicalNodes(canonicalDeckBeforeMutation, nodeIds);
  }

  function buildStudioCanonicalRemovalMutation(selection, options = {}) {
    const canonicalDeckApi = options.canonicalDeckApi && typeof options.canonicalDeckApi === 'object'
      ? options.canonicalDeckApi
      : null;
    const buildCanonicalDeck = typeof options.buildCanonicalDeck === 'function'
      ? options.buildCanonicalDeck
      : null;
    if (!canonicalDeckApi || !buildCanonicalDeck) return null;

    const canonicalDeckBeforeMutation = buildStudioCanonicalRemovalBaseline({
      canonicalDeckApi,
      buildCanonicalDeck,
      sourceDocument: options.sourceDocument
    });
    return buildStudioCanonicalRemovalDeck(selection, {
      ...options,
      canonicalDeckBeforeMutation
    });
  }

  return {
    buildStudioCanonicalRemovalBaseline,
    buildStudioCanonicalRemovalDeck,
    buildStudioCanonicalRemovalMutation
  };
});
