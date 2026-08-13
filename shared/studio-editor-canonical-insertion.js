(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorCanonicalInsertion = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function buildStudioCanonicalInsertionBaseline(options = {}) {
    const canonicalDeckApi = options.canonicalDeckApi && typeof options.canonicalDeckApi === 'object'
      ? options.canonicalDeckApi
      : null;
    const appendCanonicalNode = canonicalDeckApi
      && typeof canonicalDeckApi.appendCanonicalNode === 'function'
      ? canonicalDeckApi.appendCanonicalNode
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

    if (!appendCanonicalNode) return null;
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

  function buildStudioCanonicalInsertionDeck(element, options = {}) {
    const canonicalDeckApi = options.canonicalDeckApi && typeof options.canonicalDeckApi === 'object'
      ? options.canonicalDeckApi
      : null;
    const appendCanonicalNode = canonicalDeckApi
      && typeof canonicalDeckApi.appendCanonicalNode === 'function'
      ? canonicalDeckApi.appendCanonicalNode
      : null;
    const importElementToCanonicalNode = typeof options.importElementToCanonicalNode === 'function'
      ? options.importElementToCanonicalNode
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
    const canonicalDeckBeforeMutation = Object.prototype.hasOwnProperty.call(options, 'canonicalDeckBeforeMutation')
      ? options.canonicalDeckBeforeMutation
      : buildStudioCanonicalInsertionBaseline(options);
    const slideId = typeof options.slideId === 'string' ? options.slideId : '';
    const getNodeId = typeof options.getNodeId === 'function'
      ? options.getNodeId
      : (node) => node && node.dataset && node.dataset.editorId;

    if (!appendCanonicalNode
      || !importElementToCanonicalNode
      || !canonicalDeckBeforeMutation
      || !element
      || !slideId) {
      return null;
    }

    try {
      const canonicalNode = importElementToCanonicalNode(element, { getNodeId });
      if (!canonicalNode) return null;
      return appendCanonicalNode(canonicalDeckBeforeMutation, slideId, canonicalNode);
    } catch (err) {
      return null;
    }
  }

  function createStudioCanonicalInsertionMutationBuilders(options = {}) {
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
    const importElementToCanonicalNode = typeof options.importElementToCanonicalNode === 'function'
      ? options.importElementToCanonicalNode
      : null;
    const buildCanonicalInsertionBaseline = (insertionOptions = {}) => (
      buildStudioCanonicalInsertionBaseline({
        ...insertionOptions,
        canonicalDeckApi,
        canonicalStateApi,
        getPendingCanonicalDeck,
        buildCanonicalDeck,
        buildCanonicalDeckBaseline,
        getCanonicalDeckBaseline
      })
    );
    const buildCanonicalInsertionDeck = (element, insertionOptions = {}) => {
      const canonicalDeckBeforeMutation = Object.prototype.hasOwnProperty.call(
        insertionOptions,
        'canonicalDeckBeforeMutation'
      )
        ? insertionOptions.canonicalDeckBeforeMutation
        : buildCanonicalInsertionBaseline(insertionOptions);
      return buildStudioCanonicalInsertionDeck(element, {
        ...insertionOptions,
        canonicalDeckApi,
        canonicalStateApi,
        getPendingCanonicalDeck,
        buildCanonicalDeck,
        buildCanonicalDeckBaseline,
        getCanonicalDeckBaseline,
        importElementToCanonicalNode,
        canonicalDeckBeforeMutation
      });
    };
    const buildCanonicalInsertionSequence = (elements, sequenceOptions = {}) => {
      const canonicalDeckBeforeMutation = Object.prototype.hasOwnProperty.call(
        sequenceOptions,
        'canonicalDeckBeforeMutation'
      )
        ? sequenceOptions.canonicalDeckBeforeMutation
        : buildCanonicalInsertionBaseline(sequenceOptions);
      return buildStudioCanonicalInsertionSequence(elements, {
        ...sequenceOptions,
        canonicalDeckApi,
        canonicalStateApi,
        getPendingCanonicalDeck,
        buildCanonicalDeck,
        buildCanonicalDeckBaseline,
        getCanonicalDeckBaseline,
        importElementToCanonicalNode,
        canonicalDeckBeforeMutation
      });
    };

    return {
      buildCanonicalInsertionBaseline,
      buildCanonicalInsertionDeck,
      buildCanonicalInsertionSequence
    };
  }

  function buildStudioCanonicalInsertionSequence(elements, options = {}) {
    if (!Array.isArray(elements) || elements.length === 0) return null;

    const slideId = typeof options.slideId === 'string' ? options.slideId : '';
    const canonicalDeckBeforeMutation = Object.prototype.hasOwnProperty.call(options, 'canonicalDeckBeforeMutation')
      ? options.canonicalDeckBeforeMutation
      : buildStudioCanonicalInsertionBaseline(options);
    if (!canonicalDeckBeforeMutation || !slideId) return null;

    let nextCanonicalDeck = canonicalDeckBeforeMutation;
    for (const element of elements) {
      const appendedDeck = buildStudioCanonicalInsertionDeck(element, {
        ...options,
        canonicalDeckBeforeMutation: nextCanonicalDeck
      });
      if (!appendedDeck) return null;
      nextCanonicalDeck = appendedDeck;
    }
    return nextCanonicalDeck;
  }

  return {
    buildStudioCanonicalInsertionBaseline,
    buildStudioCanonicalInsertionDeck,
    buildStudioCanonicalInsertionSequence,
    createStudioCanonicalInsertionMutationBuilders
  };
});
