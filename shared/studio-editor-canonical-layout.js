(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorCanonicalLayout = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function buildStudioCanonicalLayoutBaseline(options = {}) {
    const canonicalDeckApi = options.canonicalDeckApi && typeof options.canonicalDeckApi === 'object'
      ? options.canonicalDeckApi
      : null;
    const buildCanonicalDeck = typeof options.buildCanonicalDeck === 'function'
      ? options.buildCanonicalDeck
      : null;

    if (!canonicalDeckApi || !buildCanonicalDeck) {
      return null;
    }

    return buildCanonicalDeck(options.sourceDocument);
  }

  function buildStudioCanonicalLayoutDeck(layoutUpdates, options = {}) {
    const canonicalDeckApi = options.canonicalDeckApi && typeof options.canonicalDeckApi === 'object'
      ? options.canonicalDeckApi
      : null;
    const updateCanonicalNodeLayout = canonicalDeckApi
      && typeof canonicalDeckApi.updateCanonicalNodeLayout === 'function'
      ? canonicalDeckApi.updateCanonicalNodeLayout
      : null;
    const canonicalDeckBeforeMutation = Object.prototype.hasOwnProperty.call(options, 'canonicalDeckBeforeMutation')
      ? options.canonicalDeckBeforeMutation
      : buildStudioCanonicalLayoutBaseline(options);

    if (!updateCanonicalNodeLayout) {
      return null;
    }

    return updateCanonicalNodeLayout(canonicalDeckBeforeMutation, Array.isArray(layoutUpdates) ? layoutUpdates : []);
  }

  function buildStudioCanonicalLayoutMutation(options = {}) {
    const canonicalDeckApi = options.canonicalDeckApi && typeof options.canonicalDeckApi === 'object'
      ? options.canonicalDeckApi
      : null;
    const buildCanonicalDeck = typeof options.buildCanonicalDeck === 'function'
      ? options.buildCanonicalDeck
      : null;
    const nextItems = Array.isArray(options.nextItems) ? options.nextItems : [];
    const getElementId = typeof options.getElementId === 'function'
      ? options.getElementId
      : (element) => element && element.dataset && element.dataset.editorId;
    if (!canonicalDeckApi || !buildCanonicalDeck) return null;

    const layoutUpdates = nextItems.map((item) => {
      const nodeId = getElementId(item && item.element);
      if (!nodeId || !Number.isFinite(item && item.nextAbsLeft) || !Number.isFinite(item && item.nextAbsTop)) {
        return null;
      }
      return {
        id: nodeId,
        layout: {
          x: item.nextAbsLeft,
          y: item.nextAbsTop
        }
      };
    }).filter(Boolean);
    const canonicalDeckBeforeMutation = buildStudioCanonicalLayoutBaseline({
      canonicalDeckApi,
      buildCanonicalDeck,
      sourceDocument: options.sourceDocument
    });
    return buildStudioCanonicalLayoutDeck(layoutUpdates, {
      canonicalDeckApi,
      canonicalDeckBeforeMutation
    });
  }

  return {
    buildStudioCanonicalLayoutBaseline,
    buildStudioCanonicalLayoutDeck,
    buildStudioCanonicalLayoutMutation
  };
});
