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
    const buildMutationCanonicalDeck = typeof options.buildMutationCanonicalDeck === 'function'
      ? options.buildMutationCanonicalDeck
      : null;
    const getPendingCanonicalDeck = typeof options.getPendingCanonicalDeck === 'function'
      ? options.getPendingCanonicalDeck
      : null;
    const getCanonicalDeckBaseline = typeof options.getCanonicalDeckBaseline === 'function'
      ? options.getCanonicalDeckBaseline
      : null;
    const getPendingTransaction = typeof options.getPendingTransaction === 'function'
      ? options.getPendingTransaction
      : null;
    const isCanonicalDeck = typeof options.isCanonicalDeck === 'function'
      ? options.isCanonicalDeck
      : null;
    const documentRef = options.documentRef && typeof options.documentRef === 'object'
      ? options.documentRef
      : null;
    const getSourceDocument = typeof options.getSourceDocument === 'function'
      ? options.getSourceDocument
      : null;
    const resolvePdfBaseHref = typeof options.resolvePdfBaseHref === 'function'
      ? options.resolvePdfBaseHref
      : null;
    const setStatus = typeof options.setStatus === 'function'
      ? options.setStatus
      : () => {};
    const pdfExport = options.pdfExport || null;
    const pptxExport = options.pptxExport || null;
    const exportButtonBindings = new WeakMap();

    function exportPdf() {
      if (!exportActions || typeof exportActions.createStudioPdfExportAction !== 'function') {
        return false;
      }
      return exportActions.createStudioPdfExportAction({
        resolveReadyState,
        buildPreviewHtml,
        buildCanonicalDeck,
        buildMutationCanonicalDeck,
        getPendingCanonicalDeck,
        getPendingTransaction,
        getCanonicalDeckBaseline,
        isCanonicalDeck,
        pdfExport,
        documentRef,
        getSourceDocument,
        resolveBaseHref: resolvePdfBaseHref,
        sourcePath: resolveValue(options.resolveSourcePath, options.sourcePath || ''),
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
        buildMutationCanonicalDeck,
        getPendingCanonicalDeck,
        getPendingTransaction,
        getCanonicalDeckBaseline,
        isCanonicalDeck,
        pptxExport,
        documentRef,
        getSourceDocument,
        setStatus,
        sourcePath: typeof sourcePath === 'string' ? sourcePath : '',
        filename: typeof filename === 'string' ? filename : 'slidenext-presentation.pptx'
      })();
    }

    function bindStudioEditorExportButtons(options = {}) {
      const documentRef = options.documentRef;
      if (!documentRef || typeof documentRef.getElementById !== 'function') {
        return { pdf: false, pptx: false };
      }

      const bindButton = (id, handler) => {
        const button = documentRef.getElementById(id);
        if (!button || typeof button.addEventListener !== 'function') return false;
        if (!exportButtonBindings.has(button)) {
          button.addEventListener('click', handler);
          exportButtonBindings.set(button, handler);
        }
        return true;
      };

      return {
        pdf: bindButton('exportPdfBtn', exportPdf),
        pptx: bindButton('exportPptxBtn', exportPptx)
      };
    }

    return {
      exportPdf,
      exportPptx,
      bindStudioEditorExportButtons
    };
  }

  return {
    createStudioEditorExportController
  };
});
