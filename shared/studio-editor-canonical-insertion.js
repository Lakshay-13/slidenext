(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorCanonicalInsertion = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
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
    if (!appendCanonicalNode) return null;
    if (getCanonicalDeckBaseline) {
      let liveCanonicalDeck = null;
      try {
        liveCanonicalDeck = getCanonicalDeckBaseline(options.sourceDocument);
      } catch (err) {
        liveCanonicalDeck = null;
      }
      if (typeof canonicalDeckApi.isCanonicalDeck !== 'function'
        || canonicalDeckApi.isCanonicalDeck(liveCanonicalDeck)) {
        if (liveCanonicalDeck) return liveCanonicalDeck;
      }
    }
    if (!buildCanonicalDeck) return null;
    return buildCanonicalDeck(options.sourceDocument);
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

    const canonicalNode = importElementToCanonicalNode(element, { getNodeId });
    if (!canonicalNode) return null;
    return appendCanonicalNode(canonicalDeckBeforeMutation, slideId, canonicalNode);
  }

  function createStudioCanonicalInsertionMutationBuilders(options = {}) {
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
    const importElementToCanonicalNode = typeof options.importElementToCanonicalNode === 'function'
      ? options.importElementToCanonicalNode
      : null;
    const buildCanonicalInsertionBaseline = (insertionOptions = {}) => (
      buildStudioCanonicalInsertionBaseline({
        ...insertionOptions,
        canonicalDeckApi,
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
