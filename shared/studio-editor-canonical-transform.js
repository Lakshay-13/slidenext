(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorCanonicalTransform = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function buildStudioCanonicalTransformBaseline(options = {}) {
    const canonicalDeckApi = options.canonicalDeckApi && typeof options.canonicalDeckApi === 'object'
      ? options.canonicalDeckApi
      : null;
    const updateCanonicalNodeLayout = canonicalDeckApi
      && typeof canonicalDeckApi.updateCanonicalNodeLayout === 'function'
      ? canonicalDeckApi.updateCanonicalNodeLayout
      : null;
    const getCanonicalDeckBaseline = typeof options.getCanonicalDeckBaseline === 'function'
      ? options.getCanonicalDeckBaseline
      : null;
    const getPendingCanonicalDeck = typeof options.getPendingCanonicalDeck === 'function'
      ? options.getPendingCanonicalDeck
      : null;
    const buildCanonicalDeck = typeof options.buildCanonicalDeckBaseline === 'function'
      ? options.buildCanonicalDeckBaseline
      : typeof options.buildCanonicalDeck === 'function'
        ? options.buildCanonicalDeck
        : null;
    const canonicalStateApi = options.canonicalStateApi
      || (root && root.SlideNextStudioEditorCanonicalState)
      || null;

    if (!updateCanonicalNodeLayout) return null;
    const createCanonicalDeckResolver = canonicalStateApi
      && typeof canonicalStateApi.createStudioEditorCanonicalDeckResolver === 'function'
      ? canonicalStateApi.createStudioEditorCanonicalDeckResolver
      : null;
    const createCanonicalDeckBaselineReader = canonicalStateApi
      && typeof canonicalStateApi.createStudioEditorCanonicalDeckBaselineReader === 'function'
      ? canonicalStateApi.createStudioEditorCanonicalDeckBaselineReader
      : null;
    if (createCanonicalDeckResolver) {
      const resolveCanonicalDeck = createCanonicalDeckResolver({
        getCanonicalDeck: () => null,
        getPendingCanonicalDeck,
        getCanonicalDeckBaseline,
        isCanonicalDeck: typeof canonicalDeckApi.isCanonicalDeck === 'function'
          ? canonicalDeckApi.isCanonicalDeck
          : null,
        buildCanonicalDeckBaseline: buildCanonicalDeck
      });
      return typeof resolveCanonicalDeck === 'function'
        ? resolveCanonicalDeck(options.sourceDocument)
        : null;
    }
    if (createCanonicalDeckBaselineReader) {
      const readCanonicalDeckBaseline = createCanonicalDeckBaselineReader({
        getPendingCanonicalDeck,
        getCanonicalDeckBaseline,
        isCanonicalDeck: typeof canonicalDeckApi.isCanonicalDeck === 'function'
          ? canonicalDeckApi.isCanonicalDeck
          : null,
        buildCanonicalDeckBaseline: buildCanonicalDeck
      });
      return typeof readCanonicalDeckBaseline === 'function'
        ? readCanonicalDeckBaseline(options.sourceDocument)
        : null;
    }

    const isValidCanonicalDeck = (value) => {
      if (!value) return false;
      const validate = typeof canonicalDeckApi.isCanonicalDeck === 'function'
        ? canonicalDeckApi.isCanonicalDeck
        : (candidate) => !!candidate
          && typeof candidate === 'object'
          && !Array.isArray(candidate)
          && Array.isArray(candidate.slides);
      try {
        return validate(value) === true;
      } catch (err) {
        return false;
      }
    };
    const readCanonicalDeckBaseline = (sourceDocument) => {
      if (getPendingCanonicalDeck) {
        try {
          const pendingCanonicalDeck = getPendingCanonicalDeck(sourceDocument);
          if (isValidCanonicalDeck(pendingCanonicalDeck)) return pendingCanonicalDeck;
        } catch (err) {
          // Fall through to the live baseline and document rebuild paths.
        }
      }
      if (getCanonicalDeckBaseline) {
        try {
          const liveCanonicalDeck = getCanonicalDeckBaseline(sourceDocument);
          if (isValidCanonicalDeck(liveCanonicalDeck)) return liveCanonicalDeck;
        } catch (err) {
          // Fall through to the document rebuild path.
        }
      }
      if (!buildCanonicalDeck) return null;
      try {
        const rebuiltCanonicalDeck = buildCanonicalDeck(sourceDocument, {
          preferLiveCanonicalDeck: false
        });
        return isValidCanonicalDeck(rebuiltCanonicalDeck) ? rebuiltCanonicalDeck : null;
      } catch (err) {
        return null;
      }
    };

    return readCanonicalDeckBaseline(options.sourceDocument);
  }

  function buildStudioCanonicalTransformDeck(finalizeResult, options = {}) {
    const canonicalDeckApi = options.canonicalDeckApi && typeof options.canonicalDeckApi === 'object'
      ? options.canonicalDeckApi
      : null;
    const canonicalStateApi = options.canonicalStateApi
      || (root && root.SlideNextStudioEditorCanonicalState)
      || null;
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

    try {
      return updateCanonicalNodeLayout(canonicalDeckBeforeMutation, layoutUpdates);
    } catch (err) {
      return null;
    }
  }

  function createStudioCanonicalTransformMutationBuilders(options = {}) {
    const canonicalDeckApi = options.canonicalDeckApi && typeof options.canonicalDeckApi === 'object'
      ? options.canonicalDeckApi
      : null;
    const canonicalStateApi = options.canonicalStateApi
      || (root && root.SlideNextStudioEditorCanonicalState)
      || null;
    const buildCanonicalDeck = typeof options.buildCanonicalDeck === 'function'
      ? options.buildCanonicalDeck
      : null;
    const buildCanonicalDeckBaseline = typeof options.buildCanonicalDeckBaseline === 'function'
      ? options.buildCanonicalDeckBaseline
      : null;
    const getCanonicalDeckBaseline = typeof options.getCanonicalDeckBaseline === 'function'
      ? options.getCanonicalDeckBaseline
      : null;
    const getPendingCanonicalDeck = typeof options.getPendingCanonicalDeck === 'function'
      ? options.getPendingCanonicalDeck
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
        canonicalStateApi,
        buildCanonicalDeck,
        buildCanonicalDeckBaseline,
        getPendingCanonicalDeck,
        getCanonicalDeckBaseline
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
        canonicalStateApi,
        buildCanonicalDeck,
        buildCanonicalDeckBaseline,
        getPendingCanonicalDeck,
        getCanonicalDeckBaseline,
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
