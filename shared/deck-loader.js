(function (root, factory) {
  const deckImport = typeof module === 'object' && module.exports
    ? require('./deck-import')
    : root && root.SlideNextDeckImport;
  const api = factory(deckImport, root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextDeckLoader = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (deckImport, root) {
  function normalizeString(value, fallback = '') {
    return typeof value === 'string' ? value : fallback;
  }

  function derivePresentationIdFromUrl(presentationUrl = '') {
    const pathParts = normalizeString(presentationUrl).split('/').filter(Boolean);
    if (pathParts.length >= 2) {
      return pathParts[pathParts.length - 2];
    }
    return '';
  }

  function buildPresentationMetadataSeed(presentationUrl = '', presentationTitle = '') {
    return {
      id: derivePresentationIdFromUrl(presentationUrl),
      title: normalizeString(presentationTitle),
      sourcePath: normalizeString(presentationUrl)
    };
  }

  function derivePresentationMetadataUrl(presentationUrl = '') {
    if (!presentationUrl || !presentationUrl.endsWith('/index.html')) {
      return '';
    }
    return presentationUrl.replace(/\/index\.html$/, '/presentation.json');
  }

  async function loadPresentationMetadata(presentationUrl = '', presentationTitle = '', options = {}) {
    const fallbackMetadata = buildPresentationMetadataSeed(presentationUrl, presentationTitle);
    const metadataUrl = derivePresentationMetadataUrl(presentationUrl);
    if (!metadataUrl) {
      return fallbackMetadata;
    }

    const fetchImpl = typeof options.fetchImpl === 'function'
      ? options.fetchImpl
      : root && typeof root.fetch === 'function'
        ? root.fetch.bind(root)
        : null;
    if (!fetchImpl) {
      return fallbackMetadata;
    }

    try {
      const response = await fetchImpl(metadataUrl, { cache: 'no-store', ...(options.requestInit || {}) });
      if (!response.ok) {
        throw new Error(`Metadata request failed with status ${response.status}`);
      }

      const metadata = await response.json();
      return {
        ...fallbackMetadata,
        ...metadata,
        sourcePath: presentationUrl
      };
    } catch (err) {
      if (typeof options.onError === 'function') {
        options.onError(err, metadataUrl);
      }
      return fallbackMetadata;
    }
  }

  function buildCanonicalDeckFromDocument(doc, options = {}) {
    if (!doc || !deckImport || typeof deckImport.importHtmlDeckToCanonicalDeck !== 'function') {
      return null;
    }

    return deckImport.importHtmlDeckToCanonicalDeck(doc, {
      presentationMetadata: options.presentationMetadata || {},
      sourcePath: normalizeString(options.sourcePath),
      getSlideId: options.getSlideId,
      getNodeId: options.getNodeId
    });
  }

  return {
    derivePresentationIdFromUrl,
    buildPresentationMetadataSeed,
    derivePresentationMetadataUrl,
    loadPresentationMetadata,
    buildCanonicalDeckFromDocument
  };
});
