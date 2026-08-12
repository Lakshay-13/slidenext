(function (root, factory) {
  const historyResultApi = typeof module === 'object' && module.exports
    ? require('./studio-editor-history-result.js')
    : root && root.SlideNextStudioEditorHistoryResult;
  const api = factory(root, historyResultApi);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorSourceController = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root, historyResultApi) {
  const isStudioHistoryCaptureFailure = historyResultApi
    && typeof historyResultApi.isStudioHistoryCaptureFailure === 'function'
    ? historyResultApi.isStudioHistoryCaptureFailure
    : (value) => value === false
      || (!!value && typeof value === 'object' && value.didCapture === false);

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

  function createStudioEditorSourceHistoryBaselineCapture(options = {}) {
    const getCurrentDocument = typeof options.getCurrentDocument === 'function'
      ? options.getCurrentDocument
      : () => null;
    const getCanonicalDeckBaseline = typeof options.getCanonicalDeckBaseline === 'function'
      ? options.getCanonicalDeckBaseline
      : null;
    const buildCanonicalDeck = typeof options.buildCanonicalDeck === 'function'
      ? options.buildCanonicalDeck
      : null;
    const saveHistoryState = typeof options.saveHistoryState === 'function'
      ? options.saveHistoryState
      : null;

    return function captureSourceHistoryBaseline() {
      const sourceDocument = getCurrentDocument();
      let canonicalDeck = null;
      if (getCanonicalDeckBaseline) {
        try {
          canonicalDeck = getCanonicalDeckBaseline(sourceDocument);
        } catch (error) {
          canonicalDeck = null;
        }
      }
      if (!canonicalDeck && buildCanonicalDeck) {
        try {
          canonicalDeck = buildCanonicalDeck(sourceDocument, {
            preferLiveCanonicalDeck: false
          });
        } catch (error) {
          canonicalDeck = null;
        }
      }
      let historyCaptureResult;
      if (saveHistoryState) {
        if (canonicalDeck) {
          historyCaptureResult = saveHistoryState(false, null, canonicalDeck);
        } else {
          historyCaptureResult = saveHistoryState(false);
        }
      }
      return !isStudioHistoryCaptureFailure(historyCaptureResult);
    };
  }

  function createStudioEditorSourceCssResolver(options = {}) {
    const getCurrentDocument = typeof options.getCurrentDocument === 'function'
      ? options.getCurrentDocument
      : () => null;
    const resolveCanonicalDeck = typeof options.resolveCanonicalDeck === 'function'
      ? options.resolveCanonicalDeck
      : null;
    const buildSourceHtml = typeof options.buildSourceHtml === 'function'
      ? options.buildSourceHtml
      : () => '';
    const extractSourceCss = typeof options.extractSourceCss === 'function'
      ? options.extractSourceCss
      : () => '';

    return function resolveSourceCss() {
      let canonicalDeck = null;
      if (resolveCanonicalDeck) {
        try {
          canonicalDeck = resolveCanonicalDeck(getCurrentDocument());
        } catch (error) {
          canonicalDeck = null;
        }
      }
      const canonicalCss = canonicalDeck
        && canonicalDeck.theme
        && typeof canonicalDeck.theme.customCss === 'string'
        ? canonicalDeck.theme.customCss
        : '';
      if (canonicalCss.trim()) return canonicalCss;

      try {
        return extractSourceCss(buildSourceHtml());
      } catch (error) {
        return '';
      }
    };
  }

  function createStudioEditorSourceCssApplier(options = {}) {
    const buildSourceHtml = typeof options.buildSourceHtml === 'function'
      ? options.buildSourceHtml
      : () => '';
    const applySourceHtml = typeof options.applySourceHtml === 'function'
      ? options.applySourceHtml
      : () => ({ success: false, error: 'Source editor is unavailable' });
    const resolveReplaceSourceCss = typeof options.resolveReplaceSourceCss === 'function'
      ? options.resolveReplaceSourceCss
      : () => null;

    return function applySourceCss(sourceCss = '') {
      const replaceSourceCss = resolveReplaceSourceCss();
      if (typeof replaceSourceCss !== 'function') {
        return { success: false, error: 'Source CSS editor is unavailable' };
      }
      return applySourceHtml(replaceSourceCss(buildSourceHtml(), sourceCss));
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
    const resolveSourceCss = typeof options.resolveSourceCss === 'function'
      ? options.resolveSourceCss
      : () => '';
    const applySourceCss = typeof options.applySourceCss === 'function'
      ? options.applySourceCss
      : null;
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
    const saveHistoryState = typeof options.saveHistoryState === 'function'
      ? options.saveHistoryState
      : null;
    const DOMParserConstructor = options.DOMParser
      || (root && root.DOMParser)
      || null;
    const isCanonicalDeck = typeof options.isCanonicalDeck === 'function'
      ? options.isCanonicalDeck
      : null;
    const beforeApply = typeof options.beforeApply === 'function'
      ? options.beforeApply
      : createStudioEditorSourceHistoryBaselineCapture({
          getCurrentDocument,
          getCanonicalDeckBaseline,
          buildCanonicalDeck,
          saveHistoryState
        });
    const captureHistoryEntry = typeof options.captureHistoryEntry === 'function'
      ? options.captureHistoryEntry
      : null;
    const restoreHistoryEntry = typeof options.restoreHistoryEntry === 'function'
      ? options.restoreHistoryEntry
      : null;
    const afterApply = typeof options.afterApply === 'function'
      ? options.afterApply
      : null;
    let sourceMode = 'html';

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
        resolveSourceHtml,
        resolveSourceCss,
        sourceMode
      });
    }

    function setMode(mode = 'html') {
      const normalizedMode = `${mode}`.trim().toLowerCase() === 'css' ? 'css' : 'html';
      if (!previewApi || typeof previewApi.setStudioSourceViewMode !== 'function') {
        return false;
      }
      const didSetMode = previewApi.setStudioSourceViewMode({
        canOpenSourceView: true,
        document: documentRef,
        mode: normalizedMode,
        editable: true,
        resolveSourceHtml,
        resolveSourceCss
      });
      if (didSetMode) sourceMode = normalizedMode;
      return didSetMode;
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
        ...(captureHistoryEntry ? { captureHistoryEntry } : {}),
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
        onApplySourceHtml: applySourceHtml,
        onApplySourceCss: applySourceCss
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
      sourceMode = 'html';
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
      setMode,
      applySourceHtml,
      apply,
      close,
      reset,
      resetPresentation
    };
  }

  return {
    createStudioEditorSourceHtmlBuilder,
    createStudioEditorSourceCssApplier,
    createStudioEditorSourceCssResolver,
    createStudioEditorSourceHistoryBaselineCapture,
    createStudioEditorSourceController
  };
});
