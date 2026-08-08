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

      canonicalDeck = nextCanonicalDeck;
      hasDocumentOwner = Object.prototype.hasOwnProperty.call(owner, 'documentRef');
      hasSessionOwner = Object.prototype.hasOwnProperty.call(owner, 'sessionToken');
      ownerDocument = hasDocumentOwner ? owner.documentRef : null;
      ownerSessionToken = hasSessionOwner ? owner.sessionToken : null;
      return canonicalDeck;
    }

    function resolve(owner = {}) {
      if (!canonicalDeck) {
        return null;
      }
      const hasOwnerDocument = Object.prototype.hasOwnProperty.call(owner, 'documentRef');
      const hasOwnerSession = Object.prototype.hasOwnProperty.call(owner, 'sessionToken');
      if (hasDocumentOwner
        && (!hasOwnerDocument || owner.documentRef !== ownerDocument)) {
        return null;
      }
      if (hasSessionOwner
        && (!hasOwnerSession || owner.sessionToken !== ownerSessionToken)) {
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

  return {
    createStudioEditorCanonicalState
  };
});
