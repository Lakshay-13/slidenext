(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorCanonicalReaderAdapter = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function resolveCanonicalStateApi(options = {}) {
    return options.canonicalStateApi && typeof options.canonicalStateApi === 'object'
      ? options.canonicalStateApi
      : null;
  }

  function resolveCanonicalDeckApi(options = {}) {
    return options.canonicalDeckApi && typeof options.canonicalDeckApi === 'object'
      ? options.canonicalDeckApi
      : null;
  }

  function resolveCanonicalReaderDependencies(options = {}) {
    return {
      canonicalStateApi: resolveCanonicalStateApi(options),
      canonicalDeckApi: resolveCanonicalDeckApi(options),
      getElementId: typeof options.getElementId === 'function'
        ? options.getElementId
        : (element) => element && element.dataset && element.dataset.editorId,
      resolveCanonicalNode: typeof options.resolveCanonicalNode === 'function'
        ? options.resolveCanonicalNode
        : null,
      buildCanonicalDeck: typeof options.buildCanonicalDeck === 'function'
        ? options.buildCanonicalDeck
        : null
    };
  }

  function getStudioEditorCanonicalVisibilityReader(property, doc, fallbackReader, options = {}) {
    const dependencies = resolveCanonicalReaderDependencies(options);
    const fallback = typeof fallbackReader === 'function' ? fallbackReader : () => false;
    const canonicalStateApi = dependencies.canonicalStateApi;
    const createVisibilityReaderResolver = canonicalStateApi
      && typeof canonicalStateApi.createStudioEditorCanonicalVisibilityReaderResolver === 'function'
      ? canonicalStateApi.createStudioEditorCanonicalVisibilityReaderResolver
      : null;
    if (createVisibilityReaderResolver) {
      try {
        return createVisibilityReaderResolver({
          buildCanonicalDeck: dependencies.buildCanonicalDeck,
          canonicalDeckApi: dependencies.canonicalDeckApi,
          getElementId: dependencies.getElementId,
          resolveCanonicalNode: dependencies.resolveCanonicalNode
        })(property, doc, fallback);
      } catch (error) {
        return fallback;
      }
    }

    let canonicalDeck = null;
    if (dependencies.buildCanonicalDeck) {
      try {
        canonicalDeck = dependencies.buildCanonicalDeck(doc);
      } catch (error) {
        canonicalDeck = null;
      }
    }
    const createVisibilityReaderForDeck = canonicalStateApi
      && typeof canonicalStateApi.createStudioEditorCanonicalVisibilityReaderForDeck === 'function'
      ? canonicalStateApi.createStudioEditorCanonicalVisibilityReaderForDeck
      : null;
    return canonicalDeck && createVisibilityReaderForDeck
      ? createVisibilityReaderForDeck(canonicalDeck, {
          property,
          canonicalDeckApi: dependencies.canonicalDeckApi,
          getElementId: dependencies.getElementId,
          resolveCanonicalNode: dependencies.resolveCanonicalNode,
          fallbackReader: fallback
        })
      : fallback;
  }

  function getStudioEditorCanonicalFreeformReader(doc, fallbackReader, options = {}) {
    const dependencies = resolveCanonicalReaderDependencies(options);
    const fallback = typeof fallbackReader === 'function' ? fallbackReader : () => false;
    const canonicalStateApi = dependencies.canonicalStateApi;
    const createFreeformReaderResolver = canonicalStateApi
      && typeof canonicalStateApi.createStudioEditorCanonicalFreeformReaderResolver === 'function'
      ? canonicalStateApi.createStudioEditorCanonicalFreeformReaderResolver
      : null;
    if (!createFreeformReaderResolver) {
      return fallback;
    }
    try {
      return createFreeformReaderResolver({
        buildCanonicalDeck: dependencies.buildCanonicalDeck,
        canonicalDeckApi: dependencies.canonicalDeckApi,
        getElementId: dependencies.getElementId,
        resolveCanonicalNode: dependencies.resolveCanonicalNode
      })(doc, fallback);
    } catch (error) {
      return fallback;
    }
  }

  function createStudioEditorCanonicalReaderResolvers(options = {}) {
    const dependencies = resolveCanonicalReaderDependencies(options);
    return {
      getStudioEditorCanonicalVisibilityReader: (property, doc, fallbackReader) => (
        getStudioEditorCanonicalVisibilityReader(property, doc, fallbackReader, dependencies)
      ),
      getStudioEditorCanonicalFreeformReader: (doc, fallbackReader) => (
        getStudioEditorCanonicalFreeformReader(doc, fallbackReader, dependencies)
      )
    };
  }

  return {
    getStudioEditorCanonicalVisibilityReader,
    getStudioEditorCanonicalFreeformReader,
    createStudioEditorCanonicalReaderResolvers
  };
});
