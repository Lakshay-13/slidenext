(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorSource = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function fail(error) {
    return {
      success: false,
      error
    };
  }

  function applyStudioEditorSource(sourceHtml = '', options = {}) {
    if (typeof sourceHtml !== 'string' || !sourceHtml.trim()) {
      return fail('Source HTML is empty');
    }

    const DOMParserConstructor = options.DOMParser
      || (root && root.DOMParser)
      || null;
    if (typeof DOMParserConstructor !== 'function') {
      return fail('Source HTML parser is unavailable');
    }

    let parsedDocument;
    try {
      parsedDocument = new DOMParserConstructor().parseFromString(sourceHtml, 'text/html');
    } catch (error) {
      return fail('Source HTML could not be parsed');
    }

    const sourceRoot = parsedDocument && parsedDocument.documentElement;
    if (!sourceRoot || typeof sourceRoot.innerHTML !== 'string') {
      return fail('Source HTML has no document root');
    }

    if (typeof options.sanitizeSourceRoot === 'function') {
      try {
        if (options.sanitizeSourceRoot(sourceRoot) === false) {
          return fail('Source HTML failed sanitization');
        }
      } catch (error) {
        return fail('Source HTML failed sanitization');
      }
    }

    const buildCanonicalDeck = typeof options.buildCanonicalDeck === 'function'
      ? options.buildCanonicalDeck
      : null;
    if (!buildCanonicalDeck) {
      return fail('Canonical deck builder is unavailable');
    }

    let canonicalDeck;
    try {
      canonicalDeck = buildCanonicalDeck(parsedDocument);
    } catch (error) {
      return fail('Source HTML could not be converted to a canonical deck');
    }

    const isCanonicalDeck = typeof options.isCanonicalDeck === 'function'
      ? options.isCanonicalDeck
      : (value) => !!value && typeof value === 'object' && Array.isArray(value.slides);
    if (!isCanonicalDeck(canonicalDeck) || canonicalDeck.slides.length === 0) {
      return fail('Source HTML must contain at least one slide');
    }

    const getCurrentDocument = typeof options.getCurrentDocument === 'function'
      ? options.getCurrentDocument
      : () => null;
    if (!getCurrentDocument()) {
      return fail('Editor frame is unavailable');
    }

    const resolveActiveSlideId = typeof options.resolveActiveSlideId === 'function'
      ? options.resolveActiveSlideId
      : () => '';
    const resolvedActiveSlideId = resolveActiveSlideId(parsedDocument, canonicalDeck);
    const activeSlideId = typeof resolvedActiveSlideId === 'string' && resolvedActiveSlideId.trim()
      ? resolvedActiveSlideId
      : (typeof canonicalDeck.slides[0].id === 'string' ? canonicalDeck.slides[0].id : '');
    const historyEntry = {
      html: sourceRoot.innerHTML,
      activeSlideId,
      selectedElementIds: [],
      canonicalDeck
    };

    if (typeof options.beforeApply === 'function' && options.beforeApply(historyEntry) === false) {
      return fail('Source HTML could not start an editor transaction');
    }

    if (typeof options.restoreHistoryEntry === 'function'
      && options.restoreHistoryEntry(historyEntry) === false) {
      return fail('Source HTML could not be applied to the editor');
    }

    if (typeof options.afterApply === 'function') {
      options.afterApply(canonicalDeck, historyEntry);
    }
    return {
      success: true,
      canonicalDeck,
      historyEntry
    };
  }

  return {
    applyStudioEditorSource
  };
});
