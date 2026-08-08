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

    function reset() {
      canonicalDeck = null;
      ownerDocument = null;
      ownerSessionToken = null;
      hasDocumentOwner = false;
      hasSessionOwner = false;
      return null;
    }

    function set(nextCanonicalDeck, owner = {}) {
      if (!isCanonicalDeck(nextCanonicalDeck)) {
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

  function createStudioEditorCanonicalVisibilityReader(canonicalDeck, options = {}) {
    const property = typeof options.property === 'string' ? options.property : '';
    const resolveCanonicalNode = typeof options.resolveCanonicalNode === 'function'
      ? options.resolveCanonicalNode
      : () => null;
    const fallbackReader = typeof options.fallbackReader === 'function'
      ? options.fallbackReader
      : () => false;

    return function readCanonicalVisibilityState(element) {
      if (canonicalDeck && property) {
        try {
          const canonicalNode = resolveCanonicalNode(element, canonicalDeck);
          const value = canonicalNode
            && canonicalNode.visibility
            && canonicalNode.visibility[property];
          if (typeof value === 'boolean') return value;
        } catch (error) {
          // Fall back to the live element when canonical lookup is unavailable.
        }
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
      return readCanonicalLockValue(element) || fallbackReader(element);
    };
  }

  return {
    createStudioEditorCanonicalState,
    createStudioEditorCanonicalLockReader,
    createStudioEditorCanonicalVisibilityReader
  };
});
