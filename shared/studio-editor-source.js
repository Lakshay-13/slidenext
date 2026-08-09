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

  function resolveSourceSlideCount(parsedDocument, sourceRoot, options = {}) {
    if (typeof options.resolveSourceSlideCount === 'function') {
      try {
        const count = options.resolveSourceSlideCount(parsedDocument, sourceRoot);
        return Number.isFinite(count) && count > 0 ? Math.floor(count) : 0;
      } catch (error) {
        return 0;
      }
    }

    const queryRoot = parsedDocument && typeof parsedDocument.querySelectorAll === 'function'
      ? parsedDocument
      : sourceRoot;
    if (!queryRoot || typeof queryRoot.querySelectorAll !== 'function') return 0;
    try {
      return queryRoot.querySelectorAll('.slide').length;
    } catch (error) {
      return 0;
    }
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
    let canonicalDeck;
    if (buildCanonicalDeck) {
      try {
        const buildOptions = {
          preferLiveCanonicalDeck: false
        };
        if (options.canonicalDeckBaseline) {
          buildOptions.canonicalDeckBaseline = options.canonicalDeckBaseline;
        }
        canonicalDeck = buildCanonicalDeck(parsedDocument, buildOptions);
      } catch (error) {
        canonicalDeck = null;
      }
    }

    const isCanonicalDeck = typeof options.isCanonicalDeck === 'function'
      ? options.isCanonicalDeck
      : (value) => !!value && typeof value === 'object' && Array.isArray(value.slides);
    let hasCanonicalSlides = false;
    try {
      hasCanonicalSlides = isCanonicalDeck(canonicalDeck)
        && canonicalDeck.slides.length > 0;
    } catch (error) {
      hasCanonicalSlides = false;
    }
    if (!hasCanonicalSlides && resolveSourceSlideCount(parsedDocument, sourceRoot, options) === 0) {
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
    let resolvedActiveSlideId = '';
    try {
      resolvedActiveSlideId = resolveActiveSlideId(parsedDocument, canonicalDeck);
    } catch (error) {
      resolvedActiveSlideId = '';
    }
    const activeSlideId = typeof resolvedActiveSlideId === 'string' && resolvedActiveSlideId.trim()
      ? resolvedActiveSlideId
      : (hasCanonicalSlides && typeof canonicalDeck.slides[0].id === 'string'
        ? canonicalDeck.slides[0].id
        : '');
    const historyEntry = {
      html: sourceRoot.innerHTML,
      activeSlideId,
      selectedElementIds: [],
      canonicalDeck
    };

    if (typeof options.beforeApply === 'function') {
      let canApply = false;
      try {
        canApply = options.beforeApply(historyEntry);
      } catch (error) {
        return fail('Source HTML could not start an editor transaction');
      }
      if (canApply === false) {
        return fail('Source HTML could not start an editor transaction');
      }
    }

    if (typeof options.restoreHistoryEntry === 'function') {
      let didRestore = false;
      try {
        didRestore = options.restoreHistoryEntry(historyEntry);
      } catch (error) {
        return fail('Source HTML could not be applied to the editor');
      }
      if (didRestore === false) {
        return fail('Source HTML could not be applied to the editor');
      }
    }

    if (typeof options.afterApply === 'function') {
      try {
        options.afterApply(canonicalDeck, historyEntry);
      } catch (error) {
        return fail('Source HTML could not be applied to the editor');
      }
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
