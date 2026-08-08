(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorCanonicalTheme = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function buildStudioCanonicalThemeBaseline(options = {}) {
    const canonicalDeckApi = options.canonicalDeckApi && typeof options.canonicalDeckApi === 'object'
      ? options.canonicalDeckApi
      : null;
    const updateCanonicalThemeTokens = canonicalDeckApi
      && typeof canonicalDeckApi.updateCanonicalThemeTokens === 'function'
      ? canonicalDeckApi.updateCanonicalThemeTokens
      : null;
    const buildCanonicalDeck = typeof options.buildCanonicalDeckBaseline === 'function'
      ? options.buildCanonicalDeckBaseline
      : typeof options.buildCanonicalDeck === 'function'
        ? options.buildCanonicalDeck
        : null;

    if (!updateCanonicalThemeTokens || !buildCanonicalDeck) return null;
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
    buildStudioCanonicalThemeBaseline,
    buildStudioCanonicalThemeDeck,
    createStudioCanonicalThemeMutationBuilders
  };
});
