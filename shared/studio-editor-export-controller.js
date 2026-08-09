(function (root, factory) {
  const exportActions = root && root.SlideNextStudioEditorExportActions;
  const api = factory(exportActions);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorExportController = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (defaultExportActions) {
  function resolveValue(value, fallback = '') {
    if (typeof value === 'function') {
      try {
        return value();
      } catch (error) {
        return fallback;
      }
    }
    return value === undefined || value === null ? fallback : value;
  }

  function createStudioEditorExportController(options = {}) {
    const exportActions = options.exportActions || defaultExportActions;
    const resolveReadyState = typeof options.resolveReadyState === 'function'
      ? options.resolveReadyState
      : () => ({ canUseDeckActions: false });
    const buildPreviewHtml = typeof options.buildPreviewHtml === 'function'
      ? options.buildPreviewHtml
      : () => '';
    const buildCanonicalDeck = typeof options.buildCanonicalDeck === 'function'
      ? options.buildCanonicalDeck
      : null;
    const getCanonicalDeckBaseline = typeof options.getCanonicalDeckBaseline === 'function'
      ? options.getCanonicalDeckBaseline
      : null;
    const isCanonicalDeck = typeof options.isCanonicalDeck === 'function'
      ? options.isCanonicalDeck
      : null;
    const documentRef = options.documentRef && typeof options.documentRef === 'object'
      ? options.documentRef
      : null;
    const setStatus = typeof options.setStatus === 'function'
      ? options.setStatus
      : () => {};
    const pdfExport = options.pdfExport || null;
    const pptxExport = options.pptxExport || null;

    function exportPdf() {
      if (!exportActions || typeof exportActions.createStudioPdfExportAction !== 'function') {
        return false;
      }
      return exportActions.createStudioPdfExportAction({
        resolveReadyState,
        buildPreviewHtml,
        buildCanonicalDeck,
        getCanonicalDeckBaseline,
        isCanonicalDeck,
        pdfExport,
        documentRef,
        setStatus
      })();
    }

    async function exportPptx() {
      if (!exportActions || typeof exportActions.createStudioPptxExportAction !== 'function') {
        return false;
      }
      const sourcePath = resolveValue(options.resolveSourcePath, options.sourcePath || '');
      const filename = resolveValue(
        options.resolveFilename,
        options.filename || 'slidenext-presentation.pptx'
      );
      return exportActions.createStudioPptxExportAction({
        resolveReadyState,
        buildCanonicalDeck,
        getCanonicalDeckBaseline,
        isCanonicalDeck,
        pptxExport,
        documentRef,
        setStatus,
        sourcePath: typeof sourcePath === 'string' ? sourcePath : '',
        filename: typeof filename === 'string' ? filename : 'slidenext-presentation.pptx'
      })();
    }

    return {
      exportPdf,
      exportPptx
    };
  }

  return {
    createStudioEditorExportController
  };
});
