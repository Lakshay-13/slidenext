(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorCanonicalNodeAdapter = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function resolveStudioEditorCanonicalNode(element, canonicalDeck, options = {}) {
    const canonicalDeckApi = options.canonicalDeckApi && typeof options.canonicalDeckApi === 'object'
      ? options.canonicalDeckApi
      : null;
    const canonicalStateApi = options.canonicalStateApi && typeof options.canonicalStateApi === 'object'
      ? options.canonicalStateApi
      : null;
    const createCanonicalNodeResolver = typeof options.canonicalNodeResolverFactory === 'function'
      ? options.canonicalNodeResolverFactory
      : canonicalStateApi
        && typeof canonicalStateApi.createStudioEditorCanonicalNodeResolver === 'function'
        ? canonicalStateApi.createStudioEditorCanonicalNodeResolver
        : null;

    if (createCanonicalNodeResolver) {
      try {
        return createCanonicalNodeResolver({ canonicalDeckApi })(element, canonicalDeck);
      } catch (error) {
        return null;
      }
    }

    // Keep partial/legacy editor contexts usable without the shared resolver.
    const elementId = element && element.dataset && element.dataset.editorId;
    if (!canonicalDeckApi
      || typeof canonicalDeckApi.findCanonicalNodeById !== 'function'
      || !elementId
      || !canonicalDeck) {
      return null;
    }
    try {
      return canonicalDeckApi.findCanonicalNodeById(canonicalDeck, elementId);
    } catch (error) {
      return null;
    }
  }

  function createStudioEditorCanonicalNodeResolver(options = {}) {
    const canonicalDeckApi = options.canonicalDeckApi && typeof options.canonicalDeckApi === 'object'
      ? options.canonicalDeckApi
      : null;
    const canonicalStateApi = options.canonicalStateApi && typeof options.canonicalStateApi === 'object'
      ? options.canonicalStateApi
      : null;
    const canonicalNodeResolverFactory = typeof options.canonicalNodeResolverFactory === 'function'
      ? options.canonicalNodeResolverFactory
      : canonicalStateApi
        && typeof canonicalStateApi.createStudioEditorCanonicalNodeResolver === 'function'
        ? canonicalStateApi.createStudioEditorCanonicalNodeResolver
        : null;

    return (element, canonicalDeck) => resolveStudioEditorCanonicalNode(element, canonicalDeck, {
      canonicalDeckApi,
      canonicalStateApi,
      canonicalNodeResolverFactory
    });
  }

  return {
    resolveStudioEditorCanonicalNode,
    createStudioEditorCanonicalNodeResolver
  };
});
