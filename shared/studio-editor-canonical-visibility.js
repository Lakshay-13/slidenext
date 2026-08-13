(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorCanonicalVisibility = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function buildStudioCanonicalVisibilityBaseline(options = {}) {
    const canonicalDeckApi = options.canonicalDeckApi && typeof options.canonicalDeckApi === 'object'
      ? options.canonicalDeckApi
      : null;
    const updateCanonicalNodeVisibility = canonicalDeckApi
      && typeof canonicalDeckApi.updateCanonicalNodeVisibility === 'function'
      ? canonicalDeckApi.updateCanonicalNodeVisibility
      : null;
    const buildCanonicalDeck = typeof options.buildCanonicalDeckBaseline === 'function'
      ? options.buildCanonicalDeckBaseline
      : typeof options.buildCanonicalDeck === 'function'
        ? options.buildCanonicalDeck
        : null;
    const getCanonicalDeckBaseline = typeof options.getCanonicalDeckBaseline === 'function'
      ? options.getCanonicalDeckBaseline
      : null;
    const getPendingCanonicalDeck = typeof options.getPendingCanonicalDeck === 'function'
      ? options.getPendingCanonicalDeck
      : null;
    const canonicalStateApi = options.canonicalStateApi
      || (root && root.SlideNextStudioEditorCanonicalState)
      || null;

    if (!updateCanonicalNodeVisibility) return null;
    const createCanonicalDeckBaselineReader = canonicalStateApi
      && typeof canonicalStateApi.createStudioEditorCanonicalDeckBaselineReader === 'function'
      ? canonicalStateApi.createStudioEditorCanonicalDeckBaselineReader
      : null;
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
    try {
      return updateCanonicalNodeVisibility(canonicalDeckBeforeMutation, nodeIds, visibilityPatch);
    } catch (err) {
      return null;
    }
  }

  function buildStudioCanonicalVisibilityMutation(selection, visibilityPatch = {}, options = {}) {
    const canonicalDeckApi = options.canonicalDeckApi && typeof options.canonicalDeckApi === 'object'
      ? options.canonicalDeckApi
      : null;
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
    const canonicalStateApi = options.canonicalStateApi
      || (root && root.SlideNextStudioEditorCanonicalState)
      || null;
    if (!canonicalDeckApi
      || (!buildCanonicalDeck && !buildCanonicalDeckBaseline && !getCanonicalDeckBaseline)) return null;

    const canonicalDeckBeforeMutation = buildStudioCanonicalVisibilityBaseline({
      canonicalDeckApi,
      canonicalStateApi,
      buildCanonicalDeck,
      buildCanonicalDeckBaseline,
      getPendingCanonicalDeck,
      getCanonicalDeckBaseline,
      sourceDocument: options.sourceDocument
    });
    return buildStudioCanonicalVisibilityDeck(selection, visibilityPatch, {
      canonicalDeckApi,
      canonicalDeckBeforeMutation,
      getElementId: options.getElementId
    });
  }

  function createStudioCanonicalVisibilityMutationBuilders(options = {}) {
    const canonicalDeckApi = options.canonicalDeckApi && typeof options.canonicalDeckApi === 'object'
      ? options.canonicalDeckApi
      : null;
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
    const canonicalStateApi = options.canonicalStateApi
      || (root && root.SlideNextStudioEditorCanonicalState)
      || null;
    const buildCanonicalVisibilityBaseline = (baselineOptions = {}) => (
      buildStudioCanonicalVisibilityBaseline({
        ...baselineOptions,
        canonicalDeckApi,
        canonicalStateApi,
        getPendingCanonicalDeck,
        buildCanonicalDeck,
        buildCanonicalDeckBaseline,
        getCanonicalDeckBaseline
      })
    );
    const buildCanonicalVisibilityDeck = (selection, visibilityPatch = {}, deckOptions = {}) => {
      const canonicalDeckBeforeMutation = Object.prototype.hasOwnProperty.call(
        deckOptions,
        'canonicalDeckBeforeMutation'
      )
        ? deckOptions.canonicalDeckBeforeMutation
        : buildCanonicalVisibilityBaseline(deckOptions);
      return buildStudioCanonicalVisibilityDeck(selection, visibilityPatch, {
        ...deckOptions,
        canonicalDeckApi,
        buildCanonicalDeck,
        buildCanonicalDeckBaseline,
        getPendingCanonicalDeck,
        getCanonicalDeckBaseline,
        canonicalDeckBeforeMutation
      });
    };
    const buildCanonicalVisibilityMutation = (selection, visibilityPatch = {}, mutationOptions = {}) => (
      buildCanonicalVisibilityDeck(selection, visibilityPatch, mutationOptions)
    );

    return {
      buildCanonicalVisibilityBaseline,
      buildCanonicalVisibilityDeck,
      buildCanonicalVisibilityMutation
    };
  }

  return {
    buildStudioCanonicalVisibilityBaseline,
    buildStudioCanonicalVisibilityDeck,
    buildStudioCanonicalVisibilityMutation,
    createStudioCanonicalVisibilityMutationBuilders
  };
});
