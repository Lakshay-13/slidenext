(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorExportActions = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function createStudioPdfExportAction(options = {}) {
    const resolveReadyState = typeof options.resolveReadyState === 'function'
      ? options.resolveReadyState
      : () => ({ canUseDeckActions: false });
    const buildPreviewHtml = typeof options.buildPreviewHtml === 'function'
      ? options.buildPreviewHtml
      : () => '';
    const buildCanonicalDeck = typeof options.buildCanonicalDeck === 'function'
      ? options.buildCanonicalDeck
      : null;
    const pdfExport = options.pdfExport && typeof options.pdfExport === 'object'
      ? options.pdfExport
      : null;
    const documentRef = options.documentRef && typeof options.documentRef === 'object'
      ? options.documentRef
      : null;
    const setStatus = typeof options.setStatus === 'function'
      ? options.setStatus
      : () => {};

    return function exportPdf() {
      const actionState = resolveReadyState();
      if (!actionState || !actionState.canUseDeckActions) return false;

      const failPdfExport = () => {
        setStatus('pdf-export-failed');
        return false;
      };
      if (!pdfExport || typeof pdfExport.openStudioPdfPrintWindow !== 'function') {
        return failPdfExport();
      }

      const html = buildPreviewHtml();
      if (!html) return failPdfExport();

      let canonicalDeck = null;
      if (buildCanonicalDeck) {
        try {
          canonicalDeck = buildCanonicalDeck();
        } catch (error) {
          canonicalDeck = null;
        }
      }

      const exportButton = documentRef && typeof documentRef.getElementById === 'function'
        ? documentRef.getElementById('exportPdfBtn')
        : null;
      if (exportButton) exportButton.disabled = true;
      setStatus('exporting-pdf');
      try {
        let pageDimensions = {};
        if (buildCanonicalDeck && typeof pdfExport.resolveStudioPdfPageDimensions === 'function') {
          try {
            pageDimensions = pdfExport.resolveStudioPdfPageDimensions(canonicalDeck);
          } catch (error) {
            pageDimensions = {};
          }
        }
        const didOpenPrintFlow = pdfExport.openStudioPdfPrintWindow({
          html,
          ...pageDimensions,
          onPrint: () => setStatus('pdf-exported'),
          onError: () => setStatus('pdf-export-failed')
        });
        if (!didOpenPrintFlow) return failPdfExport();
        return true;
      } catch (error) {
        return failPdfExport();
      } finally {
        if (exportButton) {
          exportButton.disabled = !resolveReadyState().canUseDeckActions;
        }
      }
    };
  }

  return {
    createStudioPdfExportAction
  };
});
