(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorCanonicalUi = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function resolveStudioEditorCanonicalDeck(sourceDoc = null, options = {}) {
    const buildOptions = options.buildOptions
      && typeof options.buildOptions === 'object'
      && !Array.isArray(options.buildOptions)
      ? options.buildOptions
      : {};
    const getPendingCanonicalDeck = typeof options.getPendingCanonicalDeck === 'function'
      ? options.getPendingCanonicalDeck
      : null;
    const resolveLiveCanonicalDeck = typeof options.resolveLiveCanonicalDeck === 'function'
      ? options.resolveLiveCanonicalDeck
      : null;
    const validateCanonicalDeck = typeof options.isCanonicalDeck === 'function'
      ? options.isCanonicalDeck
      : null;
    const isValidCanonicalDeck = (value) => {
      if (!value) return false;
      if (!validateCanonicalDeck) return true;
      try {
        return validateCanonicalDeck(value) === true;
      } catch (error) {
        return false;
      }
    };
    const hasCanonicalDeckBaseline = Object.prototype.hasOwnProperty.call(
      buildOptions,
      'canonicalDeckBaseline'
    );
    const canonicalDeckOverride = buildOptions.canonicalDeckOverride;
    if (isValidCanonicalDeck(canonicalDeckOverride)) return canonicalDeckOverride;
    let liveCanonicalDeck = null;

    if (getPendingCanonicalDeck && !hasCanonicalDeckBaseline) {
      try {
        const pendingCanonicalDeck = getPendingCanonicalDeck(sourceDoc);
        if (isValidCanonicalDeck(pendingCanonicalDeck)) return pendingCanonicalDeck;
      } catch (error) {
        // Continue through live and rebuilt canonical state.
      }
    }

    if (resolveLiveCanonicalDeck && buildOptions.preferLiveCanonicalDeck !== false) {
      try {
        const sessionToken = typeof options.getSessionToken === 'function'
          ? options.getSessionToken()
          : options.sessionToken || null;
        liveCanonicalDeck = resolveLiveCanonicalDeck(sourceDoc, sessionToken);
      } catch (error) {
        liveCanonicalDeck = null;
      }
    }

    if (isValidCanonicalDeck(liveCanonicalDeck)) return liveCanonicalDeck;
    if (typeof options.buildCanonicalDeck !== 'function') return null;
    let rebuiltCanonicalDeck = null;
    try {
      rebuiltCanonicalDeck = options.buildCanonicalDeck(sourceDoc, buildOptions);
    } catch (error) {
      return null;
    }
    return isValidCanonicalDeck(rebuiltCanonicalDeck) ? rebuiltCanonicalDeck : null;
  }

  function createStudioEditorCanonicalDeckResolver(options = {}) {
    const resolverOptions = {
      getPendingCanonicalDeck: typeof options.getPendingCanonicalDeck === 'function'
        ? options.getPendingCanonicalDeck
        : null,
      resolveLiveCanonicalDeck: typeof options.resolveLiveCanonicalDeck === 'function'
        ? options.resolveLiveCanonicalDeck
        : null,
      getSessionToken: typeof options.getSessionToken === 'function'
        ? options.getSessionToken
        : null,
      buildCanonicalDeck: typeof options.buildCanonicalDeck === 'function'
        ? options.buildCanonicalDeck
        : null,
      isCanonicalDeck: typeof options.isCanonicalDeck === 'function'
        ? options.isCanonicalDeck
        : null
    };

    return (sourceDoc = null, buildOptions = {}) => resolveStudioEditorCanonicalDeck(sourceDoc, {
      ...resolverOptions,
      buildOptions
    });
  }

  return {
    resolveStudioEditorCanonicalDeck,
    createStudioEditorCanonicalDeckResolver
  };
});
