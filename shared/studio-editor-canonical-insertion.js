(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorCanonicalInsertion = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
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
      : (buildCanonicalDeck ? buildCanonicalDeck(options.sourceDocument) : null);
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

  return {
    buildStudioCanonicalInsertionDeck
  };
});
