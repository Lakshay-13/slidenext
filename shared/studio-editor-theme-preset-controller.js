(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorThemePresetController = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function applyStudioThemeTokenPreset(options = {}) {
    const presetData = options.presetData && typeof options.presetData === 'object'
      ? options.presetData
      : {};
    const preset = presetData[options.presetId];
    const resolveReadyState = typeof options.resolveReadyState === 'function'
      ? options.resolveReadyState
      : () => ({ canUseDeckActions: false });
    const readyState = resolveReadyState();
    if (!preset || !preset.tokens || !readyState || !readyState.canUseDeckActions) {
      return false;
    }

    const iframeDoc = typeof options.getIframeDocument === 'function'
      ? options.getIframeDocument()
      : null;
    const canonicalThemeApi = options.canonicalThemeApi
      || (root && root.SlideNextStudioEditorCanonicalTheme)
      || null;
    const canonicalDeckApi = options.canonicalDeckApi
      || (root && root.SlideNextCanonicalDeck)
      || null;
    if (!iframeDoc
      || !canonicalThemeApi
      || typeof canonicalThemeApi.buildStudioCanonicalThemeBaseline !== 'function'
      || typeof canonicalThemeApi.buildStudioCanonicalThemeDeck !== 'function'
      || typeof canonicalThemeApi.applyStudioCanonicalThemeTokenUpdates !== 'function'
      || !canonicalDeckApi) {
      return false;
    }

    let canonicalDeckBeforeMutation = null;
    let canonicalDeck = null;
    try {
      canonicalDeckBeforeMutation = canonicalThemeApi.buildStudioCanonicalThemeBaseline({
        canonicalDeckApi,
        sourceDocument: iframeDoc,
        getCanonicalDeckBaseline: typeof options.getCanonicalDeckBaseline === 'function'
          ? options.getCanonicalDeckBaseline
          : null,
        getPendingCanonicalDeck: typeof options.getPendingCanonicalDeck === 'function'
          ? options.getPendingCanonicalDeck
          : null,
        buildCanonicalDeckBaseline: typeof options.buildCanonicalDeckBaseline === 'function'
          ? options.buildCanonicalDeckBaseline
          : null
      });
      canonicalDeck = canonicalThemeApi.buildStudioCanonicalThemeDeck(preset.tokens, {
        canonicalDeckApi,
        canonicalDeckBeforeMutation
      });
    } catch (error) {
      return false;
    }
    if (!canonicalDeck) return false;
    const rootStyle = iframeDoc.documentElement
      && iframeDoc.documentElement.style
      && typeof iframeDoc.documentElement.style.getPropertyValue === 'function'
      ? iframeDoc.documentElement.style
      : null;
    const previousTokenValues = rootStyle
      ? Object.keys(preset.tokens).reduce((values, tokenName) => {
          values[tokenName] = rootStyle.getPropertyValue(tokenName);
          return values;
        }, {})
      : null;
    if (!canonicalThemeApi.applyStudioCanonicalThemeTokenUpdates(iframeDoc, preset.tokens)) {
      return false;
    }

    const finalizeMutation = typeof options.finalizeMutation === 'function'
      ? options.finalizeMutation
      : null;
    let finalized = false;
    if (finalizeMutation) {
      try {
        finalized = finalizeMutation(`Auto: Applied ${preset.name} Theme`, {
            canonicalDeck,
            refreshThumbnails: true
          });
      } catch (err) {
        finalized = false;
      }
    }
    if (finalized === false) {
      if (previousTokenValues
        && typeof canonicalThemeApi.applyStudioCanonicalThemeTokenUpdates === 'function') {
        canonicalThemeApi.applyStudioCanonicalThemeTokenUpdates(iframeDoc, previousTokenValues);
      }
      return false;
    }

    if (typeof options.updateActionState === 'function') {
      options.updateActionState(iframeDoc);
    }
    return true;
  }

  return {
    applyStudioThemeTokenPreset
  };
});
