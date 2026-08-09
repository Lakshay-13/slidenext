(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorCanonicalRemoval = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function buildStudioCanonicalRemovalBaseline(options = {}) {
    const canonicalDeckApi = options.canonicalDeckApi && typeof options.canonicalDeckApi === 'object'
      ? options.canonicalDeckApi
      : null;
    const removeCanonicalNodes = canonicalDeckApi
      && typeof canonicalDeckApi.removeCanonicalNodes === 'function'
      ? canonicalDeckApi.removeCanonicalNodes
      : null;
    const buildCanonicalDeck = typeof options.buildCanonicalDeckBaseline === 'function'
      ? options.buildCanonicalDeckBaseline
      : typeof options.buildCanonicalDeck === 'function'
        ? options.buildCanonicalDeck
        : null;
    const getCanonicalDeckBaseline = typeof options.getCanonicalDeckBaseline === 'function'
      ? options.getCanonicalDeckBaseline
      : null;
    const canonicalStateApi = options.canonicalStateApi
      || (root && root.SlideNextStudioEditorCanonicalState)
      || null;

    if (!removeCanonicalNodes) return null;
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
        const rebuiltCanonicalDeck = buildCanonicalDeck(sourceDocument);
        return isValidCanonicalDeck(rebuiltCanonicalDeck) ? rebuiltCanonicalDeck : null;
      } catch (err) {
        return null;
      }
    };

    return readCanonicalDeckBaseline(options.sourceDocument);
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
    try {
      return removeCanonicalNodes(canonicalDeckBeforeMutation, nodeIds);
    } catch (err) {
      return null;
    }
  }

  function buildStudioCanonicalRemovalMutation(selection, options = {}) {
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
    const canonicalStateApi = options.canonicalStateApi
      || (root && root.SlideNextStudioEditorCanonicalState)
      || null;
    if (!canonicalDeckApi
      || (!buildCanonicalDeck && !buildCanonicalDeckBaseline && !getCanonicalDeckBaseline)) return null;

    const canonicalDeckBeforeMutation = buildStudioCanonicalRemovalBaseline({
      canonicalDeckApi,
      canonicalStateApi,
      buildCanonicalDeck,
      buildCanonicalDeckBaseline,
      getCanonicalDeckBaseline,
      sourceDocument: options.sourceDocument
    });
    return buildStudioCanonicalRemovalDeck(selection, {
      ...options,
      canonicalDeckBeforeMutation
    });
  }

  function createStudioCanonicalRemovalMutationBuilders(options = {}) {
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
    const buildCanonicalRemovalBaseline = (baselineOptions = {}) => (
      buildStudioCanonicalRemovalBaseline({
        ...baselineOptions,
        canonicalDeckApi,
        canonicalStateApi,
        buildCanonicalDeck,
        buildCanonicalDeckBaseline,
        getCanonicalDeckBaseline
      })
    );
    const buildCanonicalRemovalDeck = (selection, deckOptions = {}) => {
      const canonicalDeckBeforeMutation = Object.prototype.hasOwnProperty.call(
        deckOptions,
        'canonicalDeckBeforeMutation'
      )
        ? deckOptions.canonicalDeckBeforeMutation
        : buildCanonicalRemovalBaseline(deckOptions);
      return buildStudioCanonicalRemovalDeck(selection, {
        ...deckOptions,
        canonicalDeckApi,
        canonicalStateApi,
        buildCanonicalDeck,
        buildCanonicalDeckBaseline,
        getCanonicalDeckBaseline,
        canonicalDeckBeforeMutation
      });
    };
    const buildCanonicalRemovalMutation = (selection, mutationOptions = {}) => (
      buildCanonicalRemovalDeck(selection, mutationOptions)
    );

    return {
      buildCanonicalRemovalBaseline,
      buildCanonicalRemovalDeck,
      buildCanonicalRemovalMutation
    };
  }

  return {
    buildStudioCanonicalRemovalBaseline,
    buildStudioCanonicalRemovalDeck,
    buildStudioCanonicalRemovalMutation,
    createStudioCanonicalRemovalMutationBuilders
  };
});
