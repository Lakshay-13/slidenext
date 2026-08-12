(function (root, factory) {
  const canonicalDeckApi = typeof module === 'object' && module.exports
    ? require('./canonical-deck')
    : root && root.SlideNextCanonicalDeck;
  const api = factory(canonicalDeckApi);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorCanonicalState = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (canonicalDeckApi) {
  function isObject(value) {
    return !!value && typeof value === 'object';
  }

  function isStudioEditorCanonicalDeckLike(value) {
    return isObject(value)
      && !Array.isArray(value)
      && Array.isArray(value.slides);
  }

  function normalizeStudioEditorCanonicalLayoutMode(value) {
    if (typeof value !== 'string') return '';
    const normalizedValue = value.trim().toLowerCase();
    if (canonicalDeckApi && typeof canonicalDeckApi.normalizeLayoutMode === 'function') {
      return canonicalDeckApi.normalizeLayoutMode(normalizedValue, '') || normalizedValue;
    }
    return normalizedValue === 'freeform' ? 'absolute' : normalizedValue;
  }

  function createStudioEditorCanonicalState(options = {}) {
    const isCanonicalDeck = typeof options.isCanonicalDeck === 'function'
      ? options.isCanonicalDeck
      : isStudioEditorCanonicalDeckLike;
    let canonicalDeck = null;
    let ownerDocument = null;
    let ownerSessionToken = null;
    let hasDocumentOwner = false;
    let hasSessionOwner = false;

    function isValidCanonicalDeck(value) {
      try {
        return isCanonicalDeck(value) === true;
      } catch (error) {
        return false;
      }
    }

    function hasOwnerValue(value) {
      return value !== null && typeof value !== 'undefined';
    }

    function reset() {
      canonicalDeck = null;
      ownerDocument = null;
      ownerSessionToken = null;
      hasDocumentOwner = false;
      hasSessionOwner = false;
      return null;
    }

    function clear(owner = {}) {
      if (canonicalDeck && hasOwnerConflict(owner)) {
        return null;
      }
      return reset();
    }

    function hasOwnerConflict(owner = {}) {
      const resolvedOwner = owner && typeof owner === 'object' ? owner : {};
      const hasIncomingDocument = Object.prototype.hasOwnProperty.call(resolvedOwner, 'documentRef');
      const hasIncomingSession = Object.prototype.hasOwnProperty.call(resolvedOwner, 'sessionToken');
      return (hasDocumentOwner
        && (!hasIncomingDocument || resolvedOwner.documentRef !== ownerDocument))
        || (hasSessionOwner
          && (!hasIncomingSession || resolvedOwner.sessionToken !== ownerSessionToken));
    }

    function set(nextCanonicalDeck, owner = {}) {
      const resolvedOwner = owner && typeof owner === 'object' ? owner : {};
      if (canonicalDeck && hasOwnerConflict(resolvedOwner)) {
        return null;
      }
      if (!isValidCanonicalDeck(nextCanonicalDeck)) {
        return reset();
      }

      canonicalDeck = nextCanonicalDeck;
      hasDocumentOwner = Object.prototype.hasOwnProperty.call(resolvedOwner, 'documentRef')
        && hasOwnerValue(resolvedOwner.documentRef);
      hasSessionOwner = Object.prototype.hasOwnProperty.call(resolvedOwner, 'sessionToken')
        && hasOwnerValue(resolvedOwner.sessionToken);
      ownerDocument = hasDocumentOwner ? resolvedOwner.documentRef : null;
      ownerSessionToken = hasSessionOwner ? resolvedOwner.sessionToken : null;
      return canonicalDeck;
    }

    function resolve(owner = {}) {
      if (!canonicalDeck) {
        return null;
      }
      const resolvedOwner = owner && typeof owner === 'object' ? owner : {};
      const hasOwnerDocument = Object.prototype.hasOwnProperty.call(resolvedOwner, 'documentRef');
      const hasOwnerSession = Object.prototype.hasOwnProperty.call(resolvedOwner, 'sessionToken');
      if (!hasDocumentOwner
        && !hasSessionOwner
        && ((hasOwnerDocument && hasOwnerValue(resolvedOwner.documentRef))
          || (hasOwnerSession && hasOwnerValue(resolvedOwner.sessionToken)))) {
        return null;
      }
      if (hasDocumentOwner
        && (!hasOwnerDocument || resolvedOwner.documentRef !== ownerDocument)) {
        return null;
      }
      if (hasSessionOwner
        && (!hasOwnerSession || resolvedOwner.sessionToken !== ownerSessionToken)) {
        return null;
      }
      return canonicalDeck;
    }

    return {
      reset,
      clear,
      set,
      resolve
    };
  }

  function createStudioEditorCanonicalDeckBaselineReader(options = {}) {
    const getCanonicalDeckBaseline = typeof options.getCanonicalDeckBaseline === 'function'
      ? options.getCanonicalDeckBaseline
      : null;
    const buildCanonicalDeckBaseline = typeof options.buildCanonicalDeckBaseline === 'function'
      ? options.buildCanonicalDeckBaseline
      : null;
    const isCanonicalDeck = typeof options.isCanonicalDeck === 'function'
      ? options.isCanonicalDeck
      : isStudioEditorCanonicalDeckLike;

    function isValidCanonicalDeck(value) {
      if (!value) return false;
      try {
        return isCanonicalDeck(value) === true;
      } catch (error) {
        return false;
      }
    }

    return function readCanonicalDeckBaseline(sourceDocument) {
      if (getCanonicalDeckBaseline) {
        try {
          const liveCanonicalDeck = getCanonicalDeckBaseline(sourceDocument);
          if (isValidCanonicalDeck(liveCanonicalDeck)) return liveCanonicalDeck;
        } catch (error) {
          // Fall through to the document rebuild path.
        }
      }
      if (buildCanonicalDeckBaseline) {
        try {
          const rebuiltCanonicalDeck = buildCanonicalDeckBaseline(sourceDocument, {
            preferLiveCanonicalDeck: false
          });
          return isValidCanonicalDeck(rebuiltCanonicalDeck) ? rebuiltCanonicalDeck : null;
        } catch (error) {
          return null;
        }
      }
      return null;
    };
  }

  function createStudioEditorCanonicalDeckResolver(options = {}) {
    const getCanonicalDeck = typeof options.getCanonicalDeck === 'function'
      ? options.getCanonicalDeck
      : () => null;
    const isCanonicalDeck = typeof options.isCanonicalDeck === 'function'
      ? options.isCanonicalDeck
      : isStudioEditorCanonicalDeckLike;
    const readCanonicalDeckBaseline = createStudioEditorCanonicalDeckBaselineReader({
      getCanonicalDeckBaseline: options.getCanonicalDeckBaseline,
      buildCanonicalDeckBaseline: options.buildCanonicalDeckBaseline,
      isCanonicalDeck
    });

    function isValidCanonicalDeck(value) {
      if (!value) return false;
      try {
        return isCanonicalDeck(value) === true;
      } catch (error) {
        return false;
      }
    }

    return function resolveCanonicalDeck(sourceDocument) {
      const liveCanonicalDeck = readCanonicalDeckBaseline(sourceDocument);
      if (isValidCanonicalDeck(liveCanonicalDeck)) return liveCanonicalDeck;
      try {
        const fallbackCanonicalDeck = getCanonicalDeck(sourceDocument);
        return isValidCanonicalDeck(fallbackCanonicalDeck)
          ? fallbackCanonicalDeck
          : null;
      } catch (error) {
        return null;
      }
    };
  }

  function createStudioEditorCanonicalNodeReader(canonicalDeck, options = {}) {
    const resolveCanonicalNode = typeof options.resolveCanonicalNode === 'function'
      ? options.resolveCanonicalNode
      : () => null;

    return function readCanonicalNode(element) {
      if (!canonicalDeck) return null;
      try {
        return resolveCanonicalNode(element, canonicalDeck);
      } catch (error) {
        return null;
      }
    };
  }

  function createStudioEditorCanonicalNodeReaderFromApi(canonicalDeck, options = {}) {
    const canonicalDeckApi = options.canonicalDeckApi
      && typeof options.canonicalDeckApi.findCanonicalNodeById === 'function'
      ? options.canonicalDeckApi
      : null;
    const getElementId = typeof options.getElementId === 'function'
      ? options.getElementId
      : (element) => element && element.dataset && element.dataset.editorId;

    if (!canonicalDeckApi) return () => null;
    return createStudioEditorCanonicalNodeReader(canonicalDeck, {
      resolveCanonicalNode(element, deck) {
        return canonicalDeckApi.findCanonicalNodeById(deck, getElementId(element));
      }
    });
  }

  function createStudioEditorCanonicalNodeResolver(options = {}) {
    const canonicalDeckApi = options.canonicalDeckApi
      && typeof options.canonicalDeckApi.findCanonicalNodeById === 'function'
      ? options.canonicalDeckApi
      : null;
    const getElementId = typeof options.getElementId === 'function'
      ? options.getElementId
      : (element) => element && element.dataset && element.dataset.editorId;

    return function resolveStudioEditorCanonicalNode(element, canonicalDeck = null) {
      if (!canonicalDeckApi || !element || !canonicalDeck || !getElementId(element)) {
        return null;
      }
      return createStudioEditorCanonicalNodeReaderFromApi(canonicalDeck, {
        canonicalDeckApi,
        getElementId
      })(element);
    };
  }

  function createStudioEditorCanonicalFreeformReaderForDeck(canonicalDeck, options = {}) {
    const fallbackReader = typeof options.fallbackReader === 'function'
      ? options.fallbackReader
      : () => false;
    const canonicalDeckApi = options.canonicalDeckApi
      && typeof options.canonicalDeckApi.findCanonicalNodeById === 'function'
      ? options.canonicalDeckApi
      : null;
    const getElementId = typeof options.getElementId === 'function'
      ? options.getElementId
      : (element) => element && element.dataset && element.dataset.editorId;
    const resolveCanonicalNode = typeof options.resolveCanonicalNode === 'function'
      ? options.resolveCanonicalNode
      : null;
    const readCanonicalNode = canonicalDeckApi
      ? createStudioEditorCanonicalNodeReaderFromApi(canonicalDeck, {
          canonicalDeckApi,
          getElementId
        })
      : createStudioEditorCanonicalNodeReader(canonicalDeck, { resolveCanonicalNode });

    if (!canonicalDeck) return fallbackReader;
    return function readCanonicalFreeformState(element) {
      const canonicalNode = readCanonicalNode(element);
      const mode = normalizeStudioEditorCanonicalLayoutMode(
        canonicalNode && canonicalNode.layout && canonicalNode.layout.mode
      );
      if (mode === 'absolute') return true;
      if (mode === 'flow') return false;
      if (typeof mode === 'string' && mode.trim()) return false;
      return fallbackReader(element);
    };
  }

  function createStudioEditorCanonicalFreeformReaderResolver(options = {}) {
    const buildCanonicalDeck = typeof options.buildCanonicalDeck === 'function'
      ? options.buildCanonicalDeck
      : null;
    const canonicalDeckApi = options.canonicalDeckApi
      && typeof options.canonicalDeckApi.findCanonicalNodeById === 'function'
      ? options.canonicalDeckApi
      : null;
    const getElementId = typeof options.getElementId === 'function'
      ? options.getElementId
      : (element) => element && element.dataset && element.dataset.editorId;
    const resolveCanonicalNode = typeof options.resolveCanonicalNode === 'function'
      ? options.resolveCanonicalNode
      : null;

    return function resolveStudioEditorCanonicalFreeformReader(
      doc = null,
      fallbackReader = () => false
    ) {
      const fallback = typeof fallbackReader === 'function' ? fallbackReader : () => false;
      let canonicalDeck = null;
      if (buildCanonicalDeck) {
        try {
          canonicalDeck = buildCanonicalDeck(doc);
        } catch (error) {
          canonicalDeck = null;
        }
      }
      return createStudioEditorCanonicalFreeformReaderForDeck(canonicalDeck, {
        canonicalDeckApi,
        getElementId,
        resolveCanonicalNode,
        fallbackReader: fallback
      });
    };
  }

  function createStudioEditorCanonicalVisibilityReaderForDeck(canonicalDeck, options = {}) {
    const property = typeof options.property === 'string' ? options.property : '';
    const fallbackReader = typeof options.fallbackReader === 'function'
      ? options.fallbackReader
      : () => false;
    const canonicalDeckApi = options.canonicalDeckApi
      && typeof options.canonicalDeckApi.findCanonicalNodeById === 'function'
      ? options.canonicalDeckApi
      : null;
    const getElementId = typeof options.getElementId === 'function'
      ? options.getElementId
      : (element) => element && element.dataset && element.dataset.editorId;
    const resolveCanonicalNode = typeof options.resolveCanonicalNode === 'function'
      ? options.resolveCanonicalNode
      : null;

    if (!canonicalDeck) return fallbackReader;
    if (property === 'locked' && canonicalDeckApi) {
      return createStudioEditorCanonicalLockReaderFromApi(canonicalDeck, {
        canonicalDeckApi,
        getElementId,
        fallbackReader
      });
    }
    if (property === 'locked') {
      return createStudioEditorCanonicalLockReader(canonicalDeck, {
        resolveCanonicalNode,
        fallbackReader
      });
    }
    if (canonicalDeckApi) {
      return createStudioEditorCanonicalVisibilityReaderFromApi(canonicalDeck, {
        property,
        canonicalDeckApi,
        getElementId,
        fallbackReader
      });
    }
    return createStudioEditorCanonicalVisibilityReader(canonicalDeck, {
      property,
      resolveCanonicalNode,
      fallbackReader
    });
  }

  function createStudioEditorCanonicalVisibilityReaderResolver(options = {}) {
    const buildCanonicalDeck = typeof options.buildCanonicalDeck === 'function'
      ? options.buildCanonicalDeck
      : null;
    const canonicalDeckApi = options.canonicalDeckApi
      && typeof options.canonicalDeckApi.findCanonicalNodeById === 'function'
      ? options.canonicalDeckApi
      : null;
    const getElementId = typeof options.getElementId === 'function'
      ? options.getElementId
      : (element) => element && element.dataset && element.dataset.editorId;
    const resolveCanonicalNode = typeof options.resolveCanonicalNode === 'function'
      ? options.resolveCanonicalNode
      : null;

    return function resolveStudioEditorCanonicalVisibilityReader(
      property,
      doc = null,
      fallbackReader = () => false
    ) {
      const fallback = typeof fallbackReader === 'function' ? fallbackReader : () => false;
      let canonicalDeck = null;
      if (buildCanonicalDeck) {
        try {
          canonicalDeck = buildCanonicalDeck(doc);
        } catch (error) {
          canonicalDeck = null;
        }
      }
      if (!canonicalDeck) return fallback;

      return createStudioEditorCanonicalVisibilityReaderForDeck(canonicalDeck, {
        property,
        canonicalDeckApi,
        getElementId,
        resolveCanonicalNode,
        fallbackReader: fallback
      });
    };
  }

  function createStudioEditorCanonicalVisibilityReader(canonicalDeck, options = {}) {
    const property = typeof options.property === 'string' ? options.property : '';
    const readCanonicalNode = createStudioEditorCanonicalNodeReader(canonicalDeck, options);
    const fallbackReader = typeof options.fallbackReader === 'function'
      ? options.fallbackReader
      : () => false;

    return function readCanonicalVisibilityState(element) {
      if (canonicalDeck && property) {
        const canonicalNode = readCanonicalNode(element);
        const value = canonicalNode
          && canonicalNode.visibility
          && canonicalNode.visibility[property];
        if (typeof value === 'boolean') return value;
      }
      return fallbackReader(element);
    };
  }

  function createStudioEditorCanonicalLockReader(canonicalDeck, options = {}) {
    const resolveCanonicalNode = typeof options.resolveCanonicalNode === 'function'
      ? options.resolveCanonicalNode
      : () => null;
    const fallbackReader = typeof options.fallbackReader === 'function'
      ? options.fallbackReader
      : () => false;
    const readCanonicalLockValue = createStudioEditorCanonicalVisibilityReader(canonicalDeck, {
      property: 'locked',
      resolveCanonicalNode,
      fallbackReader: () => false
    });

    return function readCanonicalLockState(element) {
      return readCanonicalLockValue(element) === true || fallbackReader(element) === true;
    };
  }

  function createStudioEditorCanonicalLockReaderFromApi(canonicalDeck, options = {}) {
    const canonicalDeckApi = options.canonicalDeckApi
      && typeof options.canonicalDeckApi.findCanonicalNodeById === 'function'
      ? options.canonicalDeckApi
      : null;
    const getElementId = typeof options.getElementId === 'function'
      ? options.getElementId
      : (element) => element && element.dataset && element.dataset.editorId;
    const fallbackReader = typeof options.fallbackReader === 'function'
      ? options.fallbackReader
      : () => false;

    if (!canonicalDeckApi) return fallbackReader;
    return createStudioEditorCanonicalLockReader(canonicalDeck, {
      resolveCanonicalNode(element, deck) {
        return canonicalDeckApi.findCanonicalNodeById(deck, getElementId(element));
      },
      fallbackReader
    });
  }

  function createStudioEditorCanonicalVisibilityReaderFromApi(canonicalDeck, options = {}) {
    const canonicalDeckApi = options.canonicalDeckApi
      && typeof options.canonicalDeckApi.findCanonicalNodeById === 'function'
      ? options.canonicalDeckApi
      : null;
    const getElementId = typeof options.getElementId === 'function'
      ? options.getElementId
      : (element) => element && element.dataset && element.dataset.editorId;
    const fallbackReader = typeof options.fallbackReader === 'function'
      ? options.fallbackReader
      : () => false;

    if (!canonicalDeckApi) return fallbackReader;
    return createStudioEditorCanonicalVisibilityReader(canonicalDeck, {
      property: options.property,
      resolveCanonicalNode(element, deck) {
        return canonicalDeckApi.findCanonicalNodeById(deck, getElementId(element));
      },
      fallbackReader
    });
  }

  return {
    isStudioEditorCanonicalDeckLike,
    createStudioEditorCanonicalState,
    createStudioEditorCanonicalDeckBaselineReader,
    createStudioEditorCanonicalDeckResolver,
    createStudioEditorCanonicalNodeReader,
    createStudioEditorCanonicalNodeReaderFromApi,
    createStudioEditorCanonicalNodeResolver,
    createStudioEditorCanonicalFreeformReaderForDeck,
    createStudioEditorCanonicalFreeformReaderResolver,
    createStudioEditorCanonicalVisibilityReaderForDeck,
    createStudioEditorCanonicalVisibilityReaderResolver,
    createStudioEditorCanonicalLockReader,
    createStudioEditorCanonicalLockReaderFromApi,
    createStudioEditorCanonicalVisibilityReader,
    createStudioEditorCanonicalVisibilityReaderFromApi
  };
});
