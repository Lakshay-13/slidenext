(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorCanonicalRuntimeOptions = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function resolveDependency(options, name, globalName) {
    if (Object.prototype.hasOwnProperty.call(options, name)) {
      return options[name];
    }
    return root && root[globalName] ? root[globalName] : null;
  }

  function createStudioEditorCanonicalRuntimeOptions(options = {}) {
    return {
      canonicalStateApi: resolveDependency(
        options,
        'canonicalStateApi',
        'SlideNextStudioEditorCanonicalState'
      ),
      canonicalDeckApi: resolveDependency(
        options,
        'canonicalDeckApi',
        'SlideNextStudioEditorCanonicalDeck'
      ),
      canonicalMutationApi: resolveDependency(
        options,
        'canonicalMutationApi',
        'SlideNextStudioEditorCanonicalMutation'
      ),
      canonicalBridgeApi: resolveDependency(
        options,
        'canonicalBridgeApi',
        'SlideNextStudioEditorCanonicalBridge'
      ),
      isCanonicalDeck: options.isCanonicalDeck,
      getCurrentPresentationMetadata: options.getCurrentPresentationMetadata,
      getPersistedCanonicalDeck: options.getPersistedCanonicalDeck,
      resolveLiveCanonicalDeck: options.resolveLiveCanonicalDeck,
      resolveStoredCanonicalBaseline: options.resolveStoredCanonicalBaseline,
      buildPresentationMetadataSeed: options.buildPresentationMetadataSeed,
      getPresentationUrl: options.getPresentationUrl,
      getPresentationTitle: options.getPresentationTitle,
      buildStudioCanonicalDeck: options.buildStudioCanonicalDeck,
      buildCanonicalDeckFromDocument: options.buildCanonicalDeckFromDocument,
      getSlideId: options.getSlideId,
      getNodeId: options.getNodeId,
      buildCanonicalDeck: options.buildCanonicalDeck,
      getPendingCanonicalDeck: options.getPendingCanonicalDeck,
      getCanonicalDeckBaseline: options.getCanonicalDeckBaseline,
      getDocument: options.getDocument
    };
  }

  return {
    createStudioEditorCanonicalRuntimeOptions
  };
});
