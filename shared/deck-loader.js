(function (root, factory) {
  const deckImport = typeof module === 'object' && module.exports
    ? require('./deck-import')
    : root && root.SlideNextDeckImport;
  const presentationMetadata = typeof module === 'object' && module.exports
    ? require('./presentation-metadata')
    : root && root.SlideNextPresentationMetadata;
  const api = factory(deckImport, presentationMetadata, root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextDeckLoader = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (deckImport, presentationMetadata, root) {
  function normalizeString(value, fallback = '') {
    return typeof value === 'string' ? value : fallback;
  }

  function derivePresentationIdFromUrl(presentationUrl = '') {
    if (presentationMetadata && typeof presentationMetadata.derivePresentationIdFromHtmlPath === 'function') {
      return presentationMetadata.derivePresentationIdFromHtmlPath(presentationUrl);
    }

    const pathParts = normalizeString(presentationUrl).split('/').filter(Boolean);
    if (pathParts.length >= 2) {
      return pathParts[pathParts.length - 2];
    }
    return '';
  }

  function buildPresentationMetadataSeed(presentationUrl = '', presentationTitle = '') {
    if (presentationMetadata && typeof presentationMetadata.buildPresentationMetadataSeed === 'function') {
      return presentationMetadata.buildPresentationMetadataSeed(presentationUrl, presentationTitle);
    }

    return {
      id: derivePresentationIdFromUrl(presentationUrl),
      title: normalizeString(presentationTitle),
      sourcePath: normalizeString(presentationUrl)
    };
  }

  function derivePresentationMetadataUrl(presentationUrl = '') {
    if (presentationMetadata && typeof presentationMetadata.derivePresentationMetadataPath === 'function') {
      return presentationMetadata.derivePresentationMetadataPath(presentationUrl);
    }

    if (!presentationUrl || !presentationUrl.endsWith('/index.html')) {
      return '';
    }
    return presentationUrl.replace(/\/index\.html$/, '/presentation.json');
  }

  function normalizeLoadedPresentationMetadata(metadata = {}) {
    const nextMetadata = metadata && typeof metadata === 'object' && !Array.isArray(metadata)
      ? { ...metadata }
      : {};
    const resolvePresentationCanonicalDeck = presentationMetadata
      && typeof presentationMetadata.resolvePresentationCanonicalDeck === 'function'
      ? presentationMetadata.resolvePresentationCanonicalDeck
      : null;
    if (!resolvePresentationCanonicalDeck) {
      return nextMetadata;
    }

    const canonicalDeck = resolvePresentationCanonicalDeck(nextMetadata);
    if (canonicalDeck) {
      return {
        ...nextMetadata,
        canonicalDeck
      };
    }

    const stripPresentationCanonicalDeck = presentationMetadata
      && typeof presentationMetadata.stripPresentationCanonicalDeck === 'function'
      ? presentationMetadata.stripPresentationCanonicalDeck
      : null;
    return stripPresentationCanonicalDeck
      ? stripPresentationCanonicalDeck(nextMetadata)
      : nextMetadata;
  }

  function resolvePresentationPersistenceOptions(metadata = {}) {
    if (presentationMetadata && typeof presentationMetadata.resolvePresentationPersistenceOptions === 'function') {
      return presentationMetadata.resolvePresentationPersistenceOptions(metadata);
    }

    const nextMetadata = metadata && typeof metadata === 'object' && !Array.isArray(metadata)
      ? metadata
      : {};
    return nextMetadata.persistence && typeof nextMetadata.persistence === 'object' && !Array.isArray(nextMetadata.persistence)
      ? { ...nextMetadata.persistence }
      : {};
  }

  function mergePresentationPersistenceOptions(...optionSets) {
    if (presentationMetadata && typeof presentationMetadata.mergePresentationPersistenceOptions === 'function') {
      return presentationMetadata.mergePresentationPersistenceOptions(...optionSets);
    }

    return optionSets.reduce((mergedOptions, optionSet) => ({
      ...mergedOptions,
      ...(optionSet && typeof optionSet === 'object' && !Array.isArray(optionSet)
        ? optionSet
        : {})
    }), {});
  }

  function resolveMergedPresentationPersistenceOptions(metadata = {}, explicitOptions = {}) {
    const normalizedExplicitOptions = explicitOptions && typeof explicitOptions === 'object' && !Array.isArray(explicitOptions)
      ? { ...explicitOptions }
      : {};

    return mergePresentationPersistenceOptions(
      resolvePresentationPersistenceOptions(metadata),
      normalizedExplicitOptions
    );
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

      const responseMetadata = await response.json();
      return normalizeLoadedPresentationMetadata({
        ...fallbackMetadata,
        ...(responseMetadata && typeof responseMetadata === 'object' && !Array.isArray(responseMetadata)
          ? responseMetadata
          : {}),
        sourcePath: presentationUrl
      });
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

    const persistenceOptions = resolveMergedPresentationPersistenceOptions(
      options.presentationMetadata || {},
      options.persistenceOptions
    );
    const additionalTransientClassNames = Array.isArray(persistenceOptions.transientClassNames)
      ? persistenceOptions.transientClassNames
      : [];
    const explicitTransientClassNames = Array.isArray(options.transientClassNames)
      ? options.transientClassNames
      : [];

    return deckImport.importHtmlDeckToCanonicalDeck(doc, {
      ...options,
      presentationMetadata: options.presentationMetadata || {},
      sourcePath: normalizeString(options.sourcePath),
      persistenceOptions,
      transientClassNames: Array.from(new Set([
        ...explicitTransientClassNames,
        ...additionalTransientClassNames
      ])),
      getSlideId: options.getSlideId,
      getNodeId: options.getNodeId
    });
  }

  return {
    derivePresentationIdFromUrl,
    buildPresentationMetadataSeed,
    derivePresentationMetadataUrl,
    normalizeLoadedPresentationMetadata,
    loadPresentationMetadata,
    resolvePresentationPersistenceOptions,
    resolveMergedPresentationPersistenceOptions,
    buildCanonicalDeckFromDocument
  };
});
