(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorSourceController = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function resolveSourceBuilderOption(value, fallback = null) {
    try {
      const resolved = typeof value === 'function' ? value() : value;
      return resolved === undefined || resolved === null ? fallback : resolved;
    } catch (error) {
      return fallback;
    }
  }

  function createStudioEditorSourceHtmlBuilder(options = {}) {
    const buildDeckViewHtml = typeof options.buildDeckViewHtml === 'function'
      ? options.buildDeckViewHtml
      : () => '';
    const createDeckViewHtmlOptions = typeof options.createDeckViewHtmlOptions === 'function'
      ? options.createDeckViewHtmlOptions
      : () => null;

    return function buildSourceHtml(doc, sourceOptions = {}) {
      const normalizedSourceOptions = sourceOptions && typeof sourceOptions === 'object'
        ? sourceOptions
        : {};
      const buildStudioSourceHtml = typeof normalizedSourceOptions.buildStudioSourceHtml === 'function'
        ? normalizedSourceOptions.buildStudioSourceHtml
        : resolveSourceBuilderOption(options.resolveBuildStudioSourceHtml);
      const buildDeckSourceHtml = typeof normalizedSourceOptions.buildDeckSourceHtml === 'function'
        ? normalizedSourceOptions.buildDeckSourceHtml
        : resolveSourceBuilderOption(options.resolveBuildDeckSourceHtml);

      return buildDeckViewHtml(doc, createDeckViewHtmlOptions({
        buildSharedHtml: buildStudioSourceHtml,
        buildViewOptions: normalizedSourceOptions.buildViewOptions,
        buildCanonicalHtml: buildDeckSourceHtml
      }));
    };
  }

  function createStudioEditorSourceController(options = {}) {
    const previewApi = options.previewApi
      || (root && root.SlideNextStudioPreview)
      || null;
    const sourceApi = options.sourceApi
      || (root && root.SlideNextStudioEditorSource)
      || null;
    const documentRef = options.documentRef && typeof options.documentRef === 'object'
      ? options.documentRef
      : null;
    const resolveReadyState = typeof options.resolveReadyState === 'function'
      ? options.resolveReadyState
      : () => ({ canUseDeckActions: false });
    const resolveSourceHtml = typeof options.resolveSourceHtml === 'function'
      ? options.resolveSourceHtml
      : () => '';
    const buildCanonicalDeck = typeof options.buildCanonicalDeck === 'function'
      ? options.buildCanonicalDeck
      : null;
    const getCanonicalDeckBaseline = typeof options.getCanonicalDeckBaseline === 'function'
      ? options.getCanonicalDeckBaseline
      : null;
    const getCurrentDocument = typeof options.getCurrentDocument === 'function'
      ? options.getCurrentDocument
      : () => null;
    const resolveActiveSlideId = typeof options.resolveActiveSlideId === 'function'
      ? options.resolveActiveSlideId
      : () => '';
    const resolveHistoryOptions = typeof options.resolveHistoryOptions === 'function'
      ? options.resolveHistoryOptions
      : () => ({});
    const DOMParserConstructor = options.DOMParser
      || (root && root.DOMParser)
      || null;
    const isCanonicalDeck = typeof options.isCanonicalDeck === 'function'
      ? options.isCanonicalDeck
      : null;
    const beforeApply = typeof options.beforeApply === 'function'
      ? options.beforeApply
      : null;
    const restoreHistoryEntry = typeof options.restoreHistoryEntry === 'function'
      ? options.restoreHistoryEntry
      : null;
    const afterApply = typeof options.afterApply === 'function'
      ? options.afterApply
      : null;

    function canUseDeckActions() {
      const actionState = resolveReadyState();
      return !!(actionState && actionState.canUseDeckActions);
    }

    function open() {
      if (!canUseDeckActions()
        || !previewApi
        || typeof previewApi.openStudioSourceView !== 'function') {
        return false;
      }
      return previewApi.openStudioSourceView({
        canOpenSourceView: true,
        document: documentRef,
        editable: true,
        resolveSourceHtml
      });
    }

    function applySourceHtml(sourceHtml = '') {
      if (!canUseDeckActions()) {
        return { success: false, error: 'Editor deck is unavailable' };
      }
      if (!sourceApi || typeof sourceApi.applyStudioEditorSource !== 'function') {
        return { success: false, error: 'Source editor is unavailable' };
      }

      let historyOptions = {};
      try {
        historyOptions = resolveHistoryOptions() || {};
      } catch (error) {
        historyOptions = {};
      }
      let canonicalDeckBaseline = null;
      if (getCanonicalDeckBaseline) {
        try {
          canonicalDeckBaseline = getCanonicalDeckBaseline();
        } catch (error) {
          canonicalDeckBaseline = null;
        }
      }
      const sourceOptions = {
        DOMParser: DOMParserConstructor,
        sanitizeSourceRoot: typeof historyOptions.sanitizeFrameRoot === 'function'
          ? historyOptions.sanitizeFrameRoot
          : null,
        buildCanonicalDeck,
        ...(canonicalDeckBaseline ? { canonicalDeckBaseline } : {}),
        isCanonicalDeck,
        getCurrentDocument,
        resolveActiveSlideId,
        beforeApply,
        restoreHistoryEntry,
        afterApply
      };
      try {
        return sourceApi.applyStudioEditorSource(sourceHtml, sourceOptions);
      } catch (error) {
        return { success: false, error: 'Source HTML could not be applied' };
      }
    }

    function apply() {
      if (!canUseDeckActions()
        || !previewApi
        || typeof previewApi.applyStudioSourceView !== 'function') {
        return false;
      }
      return previewApi.applyStudioSourceView({
        canOpenSourceView: true,
        document: documentRef,
        onApplySourceHtml: applySourceHtml
      });
    }

    function close() {
      if (!previewApi || typeof previewApi.closeStudioSourceView !== 'function') {
        return false;
      }
      previewApi.closeStudioSourceView({ document: documentRef });
      return true;
    }

    function reset() {
      if (!previewApi || typeof previewApi.resetStudioSourceViewUiState !== 'function') {
        return false;
      }
      previewApi.resetStudioSourceViewUiState({ document: documentRef });
      return true;
    }

    function resetPresentation() {
      if (!previewApi || typeof previewApi.resetStudioPresentationUiState !== 'function') {
        return false;
      }
      previewApi.resetStudioPresentationUiState({ document: documentRef });
      return true;
    }

    return {
      open,
      applySourceHtml,
      apply,
      close,
      reset,
      resetPresentation
    };
  }

  return {
    createStudioEditorSourceHtmlBuilder,
    createStudioEditorSourceController
  };
});
