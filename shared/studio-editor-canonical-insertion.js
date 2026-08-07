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
    const buildCanonicalDeck = typeof options.buildCanonicalDeck === 'function'
      ? options.buildCanonicalDeck
      : null;
    if (!appendCanonicalNode || !buildCanonicalDeck) return null;
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
    const importElementToCanonicalNode = typeof options.importElementToCanonicalNode === 'function'
      ? options.importElementToCanonicalNode
      : null;
    const buildCanonicalInsertionBaseline = (insertionOptions = {}) => (
      buildStudioCanonicalInsertionBaseline({
        ...insertionOptions,
        canonicalDeckApi,
        buildCanonicalDeck
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
        importElementToCanonicalNode,
        canonicalDeckBeforeMutation
      });
    };

    return {
      buildCanonicalInsertionBaseline,
      buildCanonicalInsertionDeck
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
