(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorCanonicalTransform = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function buildStudioCanonicalTransformBaseline(options = {}) {
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

    if (!updateCanonicalNodeLayout || !buildCanonicalDeck) {
      return null;
    }

    return buildCanonicalDeck(options.sourceDocument);
  }

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
    const canonicalDeckBeforeMutation = Object.prototype.hasOwnProperty.call(options, 'canonicalDeckBeforeMutation')
      ? options.canonicalDeckBeforeMutation
      : buildStudioCanonicalTransformBaseline(options);

    if (!updateCanonicalNodeLayout || !buildCanonicalLayoutUpdates || !canonicalDeckBeforeMutation) {
      return null;
    }

    const layoutUpdates = buildCanonicalLayoutUpdates(finalizeResult, {
      getElementId: options.getElementId
    });
    if (!Array.isArray(layoutUpdates) || layoutUpdates.length === 0) return null;

    return updateCanonicalNodeLayout(canonicalDeckBeforeMutation, layoutUpdates);
  }

  function createStudioCanonicalTransformMutationBuilders(options = {}) {
    const canonicalDeckApi = options.canonicalDeckApi && typeof options.canonicalDeckApi === 'object'
      ? options.canonicalDeckApi
      : null;
    const buildCanonicalDeck = typeof options.buildCanonicalDeck === 'function'
      ? options.buildCanonicalDeck
      : null;
    const buildCanonicalLayoutUpdates = typeof options.buildCanonicalLayoutUpdates === 'function'
      ? options.buildCanonicalLayoutUpdates
      : null;
    const getElementId = typeof options.getElementId === 'function'
      ? options.getElementId
      : null;
    const buildCanonicalTransformBaseline = (baselineOptions = {}) => (
      buildStudioCanonicalTransformBaseline({
        ...baselineOptions,
        canonicalDeckApi,
        buildCanonicalDeck
      })
    );
    const buildCanonicalTransformDeck = (finalizeResult, deckOptions = {}) => {
      const canonicalDeckBeforeMutation = Object.prototype.hasOwnProperty.call(
        deckOptions,
        'canonicalDeckBeforeMutation'
      )
        ? deckOptions.canonicalDeckBeforeMutation
        : buildCanonicalTransformBaseline(deckOptions);
      const canonicalDeckOptions = canonicalDeckBeforeMutation
        ? { canonicalDeckBeforeMutation }
        : {};
      return buildStudioCanonicalTransformDeck(finalizeResult, {
        ...deckOptions,
        ...canonicalDeckOptions,
        canonicalDeckApi,
        buildCanonicalDeck,
        buildCanonicalLayoutUpdates,
        getElementId
      });
    };

    return {
      buildCanonicalTransformBaseline,
      buildCanonicalTransformDeck
    };
  }

  return {
    buildStudioCanonicalTransformBaseline,
    buildStudioCanonicalTransformDeck,
    createStudioCanonicalTransformMutationBuilders
  };
});
