(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorCanonicalTheme = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
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
    const getPendingCanonicalDeck = typeof options.getPendingCanonicalDeck === 'function'
      ? options.getPendingCanonicalDeck
      : null;
    const buildCanonicalDeck = typeof options.buildCanonicalDeckBaseline === 'function'
      ? options.buildCanonicalDeckBaseline
      : typeof options.buildCanonicalDeck === 'function'
        ? options.buildCanonicalDeck
        : null;
    const canonicalStateApi = options.canonicalStateApi
      || (root && root.SlideNextStudioEditorCanonicalState)
      || null;

    if (!updateCanonicalThemeTokens) return null;
    const createCanonicalDeckBaselineReader = canonicalStateApi
      && typeof canonicalStateApi.createStudioEditorCanonicalDeckBaselineReader === 'function'
      ? canonicalStateApi.createStudioEditorCanonicalDeckBaselineReader
      : null;
    if (createCanonicalDeckBaselineReader) {
      const readCanonicalDeckBaseline = createCanonicalDeckBaselineReader({
        getPendingCanonicalDeck,
        getCanonicalDeckBaseline,
        isCanonicalDeck: typeof canonicalDeckApi.isCanonicalDeck === 'function'
          ? canonicalDeckApi.isCanonicalDeck
          : null,
        buildCanonicalDeckBaseline: buildCanonicalDeck
      });
      return typeof readCanonicalDeckBaseline === 'function'
        ? readCanonicalDeckBaseline(options.sourceDocument)
        : null;
    }

    const isValidCanonicalDeck = (value) => {
      if (!value) return false;
      const validate = typeof canonicalDeckApi.isCanonicalDeck === 'function'
        ? canonicalDeckApi.isCanonicalDeck
        : (candidate) => !!candidate
          && typeof candidate === 'object'
          && !Array.isArray(candidate)
          && Array.isArray(candidate.slides);
      try {
        return validate(value) === true;
      } catch (err) {
        return false;
      }
    };
    const readCanonicalDeckBaseline = (sourceDocument) => {
      if (getCanonicalDeckBaseline) {
        try {
          const liveCanonicalDeck = getCanonicalDeckBaseline(sourceDocument);
          if (isValidCanonicalDeck(liveCanonicalDeck)) return liveCanonicalDeck;
        } catch (err) {
          // Fall through to the document rebuild path.
        }
      }
      if (!buildCanonicalDeck) return null;
      try {
        const rebuiltCanonicalDeck = buildCanonicalDeck(sourceDocument, {
          preferLiveCanonicalDeck: false
        });
        return isValidCanonicalDeck(rebuiltCanonicalDeck) ? rebuiltCanonicalDeck : null;
      } catch (err) {
        return null;
      }
    };

    return readCanonicalDeckBaseline(options.sourceDocument);
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
    try {
      return updateCanonicalThemeTokens(canonicalDeckBeforeMutation, tokenUpdates);
    } catch (err) {
      return null;
    }
  }

  function createStudioCanonicalThemeMutationBuilders(options = {}) {
    const canonicalDeckApi = options.canonicalDeckApi && typeof options.canonicalDeckApi === 'object'
      ? options.canonicalDeckApi
      : null;
    const canonicalStateApi = options.canonicalStateApi
      || (root && root.SlideNextStudioEditorCanonicalState)
      || null;
    const buildCanonicalDeck = typeof options.buildCanonicalDeck === 'function'
      ? options.buildCanonicalDeck
      : null;
    const buildCanonicalDeckBaseline = typeof options.buildCanonicalDeckBaseline === 'function'
      ? options.buildCanonicalDeckBaseline
      : null;
    const getPendingCanonicalDeck = typeof options.getPendingCanonicalDeck === 'function'
      ? options.getPendingCanonicalDeck
      : null;
    const buildCanonicalThemeBaseline = (baselineOptions = {}) => (
      buildStudioCanonicalThemeBaseline({
        ...baselineOptions,
        canonicalDeckApi,
        canonicalStateApi,
        buildCanonicalDeck,
        buildCanonicalDeckBaseline,
        getPendingCanonicalDeck
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
        canonicalStateApi,
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
