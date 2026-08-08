(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorCanonicalState = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function isObject(value) {
    return !!value && typeof value === 'object';
  }

  function createStudioEditorCanonicalState(options = {}) {
    const isCanonicalDeck = typeof options.isCanonicalDeck === 'function'
      ? options.isCanonicalDeck
      : (value) => isObject(value) && Array.isArray(value.slides);
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

    function reset() {
      canonicalDeck = null;
      ownerDocument = null;
      ownerSessionToken = null;
      hasDocumentOwner = false;
      hasSessionOwner = false;
      return null;
    }

    function set(nextCanonicalDeck, owner = {}) {
      if (!isValidCanonicalDeck(nextCanonicalDeck)) {
        return reset();
      }

      const resolvedOwner = owner && typeof owner === 'object' ? owner : {};
      canonicalDeck = nextCanonicalDeck;
      hasDocumentOwner = Object.prototype.hasOwnProperty.call(resolvedOwner, 'documentRef');
      hasSessionOwner = Object.prototype.hasOwnProperty.call(resolvedOwner, 'sessionToken');
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
      : null;

    function isValidLiveCanonicalDeck(value) {
      if (!value) return false;
      if (!isCanonicalDeck) return true;
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
          if (isValidLiveCanonicalDeck(liveCanonicalDeck)) return liveCanonicalDeck;
        } catch (error) {
          // Fall through to the document rebuild path.
        }
      }
      if (buildCanonicalDeckBaseline) {
        try {
          return buildCanonicalDeckBaseline(sourceDocument);
        } catch (error) {
          return null;
        }
      }
      return null;
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
    createStudioEditorCanonicalState,
    createStudioEditorCanonicalDeckBaselineReader,
    createStudioEditorCanonicalNodeReader,
    createStudioEditorCanonicalLockReader,
    createStudioEditorCanonicalLockReaderFromApi,
    createStudioEditorCanonicalVisibilityReader,
    createStudioEditorCanonicalVisibilityReaderFromApi
  };
});
