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

  function resolveNormalizedString(value, fallback = '') {
    const nextValue = normalizeString(value).trim();
    return nextValue || normalizeString(fallback).trim();
  }

  function normalizeStringArray(values) {
    if (!Array.isArray(values)) return [];
    return values.filter(value => typeof value === 'string' && value.trim() !== '');
  }

  function normalizeUniqueTrimmedStringArray(values) {
    return Array.from(new Set(
      normalizeStringArray(values)
        .map((value) => value.trim())
        .filter(Boolean)
    ));
  }

  function normalizeStyleCleanupEntries(values) {
    if (!Array.isArray(values)) {
      return [];
    }

    const seenEntries = new Set();
    return values.reduce((entries, value) => {
      const nextValue = asPlainObject(value);
      const selector = normalizeString(nextValue.selector).trim();
      const properties = normalizeUniqueTrimmedStringArray(nextValue.properties);
      if (!selector || properties.length === 0) {
        return entries;
      }
      const entryKey = JSON.stringify([selector, properties]);
      if (seenEntries.has(entryKey)) {
        return entries;
      }
      seenEntries.add(entryKey);
      entries.push({
        selector,
        properties
      });
      return entries;
    }, []);
  }

  function mergeStyleCleanupEntries(...valueSets) {
    const mergedEntries = [];
    const entryIndexesBySelector = new Map();

    valueSets.forEach((values) => {
      normalizeStyleCleanupEntries(values).forEach((entry) => {
        if (!entryIndexesBySelector.has(entry.selector)) {
          entryIndexesBySelector.set(entry.selector, mergedEntries.length);
          mergedEntries.push({
            selector: entry.selector,
            properties: [...entry.properties]
          });
          return;
        }

        const entryIndex = entryIndexesBySelector.get(entry.selector);
        const mergedEntry = mergedEntries[entryIndex];
        const nextProperties = normalizeUniqueTrimmedStringArray([
          ...(Array.isArray(mergedEntry.properties) ? mergedEntry.properties : []),
          ...entry.properties
        ]);
        mergedEntries[entryIndex] = {
          selector: mergedEntry.selector,
          properties: nextProperties
        };
      });
    });

    return mergedEntries;
  }

  function normalizePresentationPersistenceOptions(persistence = {}) {
    const nextPersistence = asPlainObject(persistence);
    const emptyContainerIds = normalizeUniqueTrimmedStringArray(nextPersistence.emptyContainerIds);
    const styleCleanups = normalizeStyleCleanupEntries(nextPersistence.styleCleanups);
    const transientClassNames = normalizeUniqueTrimmedStringArray(nextPersistence.transientClassNames);

    if (emptyContainerIds.length === 0 && styleCleanups.length === 0 && transientClassNames.length === 0) {
      return {};
    }

    const persistenceOptions = {};
    if (emptyContainerIds.length > 0) {
      persistenceOptions.emptyContainerIds = emptyContainerIds;
    }
    if (styleCleanups.length > 0) {
      persistenceOptions.styleCleanups = styleCleanups;
    }
    if (transientClassNames.length > 0) {
      persistenceOptions.transientClassNames = transientClassNames;
    }
    return persistenceOptions;
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

  function resolvePresentationCanonicalDeckMetadata(rawDeckMetadata = {}, metadata = {}) {
    const nextDeckMetadata = asPlainObject(rawDeckMetadata);
    const nextMetadata = asPlainObject(metadata);
    const deckTags = normalizeStringArray(nextDeckMetadata.tags);
    const metadataTags = normalizeStringArray(nextMetadata.tags);

    return {
      id: resolveNormalizedString(nextDeckMetadata.id, nextMetadata.id),
      title: resolveNormalizedString(nextDeckMetadata.title, nextMetadata.title),
      subtitle: resolveNormalizedString(nextDeckMetadata.subtitle, nextMetadata.subtitle),
      description: resolveNormalizedString(nextDeckMetadata.description, nextMetadata.description),
      icon: resolveNormalizedString(nextDeckMetadata.icon, nextMetadata.icon),
      tags: deckTags.length > 0 ? deckTags : metadataTags,
      sourcePath: resolveNormalizedString(nextDeckMetadata.sourcePath, nextMetadata.sourcePath)
    };
  }

  function resolvePresentationCanonicalDeck(metadata = {}, options = {}) {
    const nextMetadata = asPlainObject(metadata);
    const rawDeck = nextMetadata.canonicalDeck;
    if (!rawDeck || !Array.isArray(rawDeck.slides)) {
      return null;
    }

    const createCanonicalDeck = typeof options.createCanonicalDeck === 'function'
      ? options.createCanonicalDeck
      : canonicalDeck && typeof canonicalDeck.createCanonicalDeck === 'function'
        ? canonicalDeck.createCanonicalDeck
        : null;
    const isCanonicalDeck = typeof options.isCanonicalDeck === 'function'
      ? options.isCanonicalDeck
      : canonicalDeck && typeof canonicalDeck.isCanonicalDeck === 'function'
        ? canonicalDeck.isCanonicalDeck
        : null;
    const deckLike = {
      ...asPlainObject(rawDeck),
      metadata: resolvePresentationCanonicalDeckMetadata(rawDeck.metadata, nextMetadata)
    };
    const nextDeck = createCanonicalDeck ? createCanonicalDeck(deckLike) : deckLike;

    return isCanonicalDeck && isCanonicalDeck(nextDeck)
      ? nextDeck
      : null;
  }

  function resolvePresentationPersistenceOptions(metadata = {}) {
    const nextMetadata = asPlainObject(metadata);
    return normalizePresentationPersistenceOptions(nextMetadata.persistence);
  }

  function mergePresentationPersistenceOptions(...optionSets) {
    const normalizedOptionSets = optionSets
      .map((optionSet) => normalizePresentationPersistenceOptions(optionSet))
      .filter((optionSet) => Object.keys(optionSet).length > 0);

    if (normalizedOptionSets.length === 0) {
      return {};
    }

    const emptyContainerIds = normalizeUniqueTrimmedStringArray(
      normalizedOptionSets.flatMap((optionSet) => optionSet.emptyContainerIds || [])
    );
    const styleCleanups = mergeStyleCleanupEntries(
      ...normalizedOptionSets.map((optionSet) => optionSet.styleCleanups || [])
    );
    const transientClassNames = normalizeUniqueTrimmedStringArray(
      normalizedOptionSets.flatMap((optionSet) => optionSet.transientClassNames || [])
    );

    return normalizePresentationPersistenceOptions({
      emptyContainerIds,
      styleCleanups,
      transientClassNames
    });
  }

  function mergePresentationCanonicalDeck(metadata = {}, deckLike = null, options = {}) {
    const nextMetadata = asPlainObject(metadata);
    const nextCanonicalDeck = resolvePresentationCanonicalDeck({
      canonicalDeck: deckLike
    }, {
      createCanonicalDeck: options.createCanonicalDeck,
      isCanonicalDeck: options.isCanonicalDeck
    });

    if (!nextCanonicalDeck) {
      return nextMetadata;
    }

    return {
      ...nextMetadata,
      canonicalDeck: nextCanonicalDeck
    };
  }

  function stripPresentationCanonicalDeck(metadata = {}) {
    const nextMetadata = asPlainObject(metadata);
    if (!Object.prototype.hasOwnProperty.call(nextMetadata, 'canonicalDeck')) {
      return nextMetadata;
    }
    delete nextMetadata.canonicalDeck;
    return nextMetadata;
  }

  return {
    derivePresentationMetadataPath,
    derivePresentationIdFromHtmlPath,
    buildPresentationMetadataSeed,
    resolvePresentationCanonicalDeck,
    resolvePresentationPersistenceOptions,
    mergePresentationPersistenceOptions,
    mergePresentationCanonicalDeck,
    stripPresentationCanonicalDeck
  };
});
