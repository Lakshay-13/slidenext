(function (root, factory) {
  const deckHtml = typeof module === 'object' && module.exports
    ? require('./deck-html')
    : root && root.SlideNextDeckHtml;
  const api = factory(deckHtml);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioDeckView = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (deckHtml) {
  function buildStudioPreviewHtml(doc, options = {}) {
    if (!doc || !deckHtml || typeof deckHtml.buildDeckPreviewHtml !== 'function') {
      return '';
    }

    const canonicalDeck = typeof options.buildCanonicalDeck === 'function'
      ? options.buildCanonicalDeck(doc)
      : null;
    if (!canonicalDeck) {
      return '';
    }

    return deckHtml.buildDeckPreviewHtml(canonicalDeck, options.presentationUrl || '', options.deckHtmlOptions || {});
  }

  function buildStudioSourceHtml(doc, options = {}) {
    if (doc && deckHtml && typeof deckHtml.buildDeckSourceHtml === 'function') {
      const canonicalDeck = typeof options.buildCanonicalDeck === 'function'
        ? options.buildCanonicalDeck(doc)
        : null;
      if (canonicalDeck) {
        return deckHtml.buildDeckSourceHtml(canonicalDeck, options.deckHtmlOptions || {});
      }
    }

    return typeof options.buildFallbackHtml === 'function'
      ? options.buildFallbackHtml(doc)
      : '';
  }

  return {
    buildStudioPreviewHtml,
    buildStudioSourceHtml
  };
});
