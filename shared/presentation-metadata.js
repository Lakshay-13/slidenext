(function (root, factory) {
  const canonicalDeck = typeof module === 'object' && module.exports
    ? require('./canonical-deck')
    : root && root.SlideNextCanonicalDeck;
  const api = factory(canonicalDeck);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextPresentationMetadata = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (canonicalDeck) {
  function normalizeString(value, fallback = '') {
    return typeof value === 'string' ? value : fallback;
  }

  function asPlainObject(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return {};
    }
    return { ...value };
  }

  function derivePresentationMetadataPath(htmlPath = '') {
    if (!htmlPath || !htmlPath.endsWith('/index.html')) {
      return '';
    }
    return htmlPath.replace(/\/index\.html$/, '/presentation.json');
  }

  function derivePresentationIdFromHtmlPath(htmlPath = '') {
    const pathParts = normalizeString(htmlPath).split('/').filter(Boolean);
    if (pathParts.length >= 2) {
      return pathParts[pathParts.length - 2];
    }
    return '';
  }

  function buildPresentationMetadataSeed(htmlPath = '', title = '') {
    return {
      id: derivePresentationIdFromHtmlPath(htmlPath),
      title: normalizeString(title),
      sourcePath: normalizeString(htmlPath)
    };
  }

  function mergePresentationCanonicalDeck(metadata = {}, deckLike = null, options = {}) {
    const nextMetadata = asPlainObject(metadata);
    const isCanonicalDeck = typeof options.isCanonicalDeck === 'function'
      ? options.isCanonicalDeck
      : canonicalDeck && typeof canonicalDeck.isCanonicalDeck === 'function'
        ? canonicalDeck.isCanonicalDeck
        : null;

    if (!deckLike || (isCanonicalDeck && !isCanonicalDeck(deckLike))) {
      return nextMetadata;
    }

    return {
      ...nextMetadata,
      canonicalDeck: deckLike
    };
  }

  return {
    derivePresentationMetadataPath,
    derivePresentationIdFromHtmlPath,
    buildPresentationMetadataSeed,
    mergePresentationCanonicalDeck
  };
});
