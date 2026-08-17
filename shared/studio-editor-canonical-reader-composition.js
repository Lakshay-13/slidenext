(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorCanonicalReaderComposition = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function resolveApi(options, optionName, globalName) {
    if (options && options[optionName]) {
      return options[optionName];
    }
    return root && root[globalName] ? root[globalName] : null;
  }

  function createStudioEditorCanonicalReaderComposition(options = {}) {
    const canonicalReaderAdapter = resolveApi(
      options,
      'canonicalReaderAdapter',
      'SlideNextStudioEditorCanonicalReaderAdapter'
    );
    const canonicalReaderResolvers = options.canonicalReaderResolvers
      && typeof options.canonicalReaderResolvers === 'object'
      ? options.canonicalReaderResolvers
      : null;
    const canonicalStateApi = resolveApi(
      options,
      'canonicalStateApi',
      'SlideNextStudioEditorCanonicalState'
    );
    const canonicalDeckApi = resolveApi(
      options,
      'canonicalDeckApi',
      'SlideNextCanonicalDeck'
    );
    const resolveCanonicalDeck = typeof options.resolveCanonicalDeck === 'function'
      ? options.resolveCanonicalDeck
      : null;
    const getElementId = typeof options.getElementId === 'function'
      ? options.getElementId
      : null;
    const resolveCanonicalNode = typeof options.resolveCanonicalNode === 'function'
      ? options.resolveCanonicalNode
      : null;

    function buildAdapterOptions() {
      return {
        canonicalStateApi,
        canonicalDeckApi,
        getElementId,
        resolveCanonicalNode,
        buildCanonicalDeck: resolveCanonicalDeck
      };
    }

    function getStudioEditorCanonicalVisibilityReader(property, doc, fallbackReader) {
      const fallback = typeof fallbackReader === 'function' ? fallbackReader : () => false;
      if (canonicalReaderResolvers
        && typeof canonicalReaderResolvers.getStudioEditorCanonicalVisibilityReader === 'function') {
        try {
          return canonicalReaderResolvers.getStudioEditorCanonicalVisibilityReader(
            property,
            doc,
            fallback
          );
        } catch (error) {
          return fallback;
        }
      }
      if (canonicalReaderAdapter
        && typeof canonicalReaderAdapter.getStudioEditorCanonicalVisibilityReader === 'function') {
        try {
          return canonicalReaderAdapter.getStudioEditorCanonicalVisibilityReader(
            property,
            doc,
            fallback,
            buildAdapterOptions()
          );
        } catch (error) {
          return fallback;
        }
      }
      return fallback;
    }

    function getStudioEditorCanonicalFreeformReader(doc, fallbackReader) {
      const fallback = typeof fallbackReader === 'function' ? fallbackReader : () => false;
      if (canonicalReaderResolvers
        && typeof canonicalReaderResolvers.getStudioEditorCanonicalFreeformReader === 'function') {
        try {
          return canonicalReaderResolvers.getStudioEditorCanonicalFreeformReader(doc, fallback);
        } catch (error) {
          return fallback;
        }
      }
      if (canonicalReaderAdapter
        && typeof canonicalReaderAdapter.getStudioEditorCanonicalFreeformReader === 'function') {
        try {
          return canonicalReaderAdapter.getStudioEditorCanonicalFreeformReader(
            doc,
            fallback,
            buildAdapterOptions()
          );
        } catch (error) {
          return fallback;
        }
      }
      return fallback;
    }

    return {
      getStudioEditorCanonicalVisibilityReader,
      getStudioEditorCanonicalFreeformReader
    };
  }

  return {
    createStudioEditorCanonicalReaderComposition
  };
});
