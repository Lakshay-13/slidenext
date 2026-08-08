(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorCanonicalTheme = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function isCanonicalThemeTokenName(value) {
    return /^--[A-Za-z_][A-Za-z0-9_-]*$/.test(typeof value === 'string' ? value.trim() : '');
  }

  function applyStudioCanonicalThemeTokenUpdates(documentRef, tokenUpdates = {}) {
    const rootStyle = documentRef
      && documentRef.documentElement
      && documentRef.documentElement.style
      && typeof documentRef.documentElement.style.setProperty === 'function'
      ? documentRef.documentElement.style
      : null;
    if (!rootStyle || !tokenUpdates || typeof tokenUpdates !== 'object' || Array.isArray(tokenUpdates)) {
      return false;
    }

    let didChange = false;
    Object.entries(tokenUpdates).forEach(([rawName, rawValue]) => {
      const tokenName = typeof rawName === 'string' ? rawName.trim() : '';
      if (!isCanonicalThemeTokenName(tokenName)) return;

      if (rawValue === null || rawValue === undefined || `${rawValue}`.trim() === '') {
        if (typeof rootStyle.removeProperty === 'function' && rootStyle.getPropertyValue(tokenName)) {
          rootStyle.removeProperty(tokenName);
          didChange = true;
        }
        return;
      }

      const tokenValue = `${rawValue}`.trim();
      if (rootStyle.getPropertyValue(tokenName) !== tokenValue) {
        rootStyle.setProperty(tokenName, tokenValue);
        didChange = true;
      }
    });

    return didChange;
  }

  function buildStudioCanonicalThemeBaseline(options = {}) {
    const canonicalDeckApi = options.canonicalDeckApi && typeof options.canonicalDeckApi === 'object'
      ? options.canonicalDeckApi
      : null;
    const updateCanonicalThemeTokens = canonicalDeckApi
      && typeof canonicalDeckApi.updateCanonicalThemeTokens === 'function'
      ? canonicalDeckApi.updateCanonicalThemeTokens
      : null;
    const getCanonicalDeckBaseline = typeof options.getCanonicalDeckBaseline === 'function'
      ? options.getCanonicalDeckBaseline
      : null;
    const buildCanonicalDeck = typeof options.buildCanonicalDeckBaseline === 'function'
      ? options.buildCanonicalDeckBaseline
      : typeof options.buildCanonicalDeck === 'function'
        ? options.buildCanonicalDeck
        : null;

    if (!updateCanonicalThemeTokens) return null;

    if (getCanonicalDeckBaseline) {
      let liveCanonicalDeck = null;
      try {
        liveCanonicalDeck = getCanonicalDeckBaseline(options.sourceDocument);
      } catch (err) {
        liveCanonicalDeck = null;
      }
      if (typeof canonicalDeckApi.isCanonicalDeck !== 'function'
        || canonicalDeckApi.isCanonicalDeck(liveCanonicalDeck)) {
        if (liveCanonicalDeck) return liveCanonicalDeck;
      }
    }

    if (!buildCanonicalDeck) return null;
    return buildCanonicalDeck(options.sourceDocument);
  }

  function buildStudioCanonicalThemeDeck(tokenUpdates = {}, options = {}) {
    const canonicalDeckApi = options.canonicalDeckApi && typeof options.canonicalDeckApi === 'object'
      ? options.canonicalDeckApi
      : null;
    const updateCanonicalThemeTokens = canonicalDeckApi
      && typeof canonicalDeckApi.updateCanonicalThemeTokens === 'function'
      ? canonicalDeckApi.updateCanonicalThemeTokens
      : null;
    const canonicalDeckBeforeMutation = Object.prototype.hasOwnProperty.call(
      options,
      'canonicalDeckBeforeMutation'
    )
      ? options.canonicalDeckBeforeMutation
      : buildStudioCanonicalThemeBaseline(options);

    if (!updateCanonicalThemeTokens || !canonicalDeckBeforeMutation) return null;
    return updateCanonicalThemeTokens(canonicalDeckBeforeMutation, tokenUpdates);
  }

  function createStudioCanonicalThemeMutationBuilders(options = {}) {
    const canonicalDeckApi = options.canonicalDeckApi && typeof options.canonicalDeckApi === 'object'
      ? options.canonicalDeckApi
      : null;
    const buildCanonicalDeck = typeof options.buildCanonicalDeck === 'function'
      ? options.buildCanonicalDeck
      : null;
    const buildCanonicalDeckBaseline = typeof options.buildCanonicalDeckBaseline === 'function'
      ? options.buildCanonicalDeckBaseline
      : null;
    const buildCanonicalThemeBaseline = (baselineOptions = {}) => (
      buildStudioCanonicalThemeBaseline({
        ...baselineOptions,
        canonicalDeckApi,
        buildCanonicalDeck,
        buildCanonicalDeckBaseline
      })
    );
    const buildCanonicalThemeDeck = (tokenUpdates = {}, mutationOptions = {}) => {
      const canonicalDeckBeforeMutation = Object.prototype.hasOwnProperty.call(
        mutationOptions,
        'canonicalDeckBeforeMutation'
      )
        ? mutationOptions.canonicalDeckBeforeMutation
        : buildCanonicalThemeBaseline(mutationOptions);
      return buildStudioCanonicalThemeDeck(tokenUpdates, {
        ...mutationOptions,
        canonicalDeckApi,
        buildCanonicalDeck,
        buildCanonicalDeckBaseline,
        canonicalDeckBeforeMutation
      });
    };

    return {
      buildCanonicalThemeBaseline,
      buildCanonicalThemeDeck
    };
  }

  return {
    isCanonicalThemeTokenName,
    applyStudioCanonicalThemeTokenUpdates,
    buildStudioCanonicalThemeBaseline,
    buildStudioCanonicalThemeDeck,
    createStudioCanonicalThemeMutationBuilders
  };
});
