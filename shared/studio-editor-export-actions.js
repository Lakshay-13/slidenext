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

  function createStudioPptxExportAction(options = {}) {
    const resolveReadyState = typeof options.resolveReadyState === 'function'
      ? options.resolveReadyState
      : () => ({ canUseDeckActions: false });
    const buildCanonicalDeck = typeof options.buildCanonicalDeck === 'function'
      ? options.buildCanonicalDeck
      : null;
    const pptxExport = options.pptxExport && typeof options.pptxExport === 'object'
      ? options.pptxExport
      : null;
    const documentRef = options.documentRef && typeof options.documentRef === 'object'
      ? options.documentRef
      : null;
    const setStatus = typeof options.setStatus === 'function'
      ? options.setStatus
      : () => {};
    const sourcePath = typeof options.sourcePath === 'string' ? options.sourcePath : '';
    const filename = typeof options.filename === 'string' && options.filename.trim()
      ? options.filename
      : 'slidenext-presentation.pptx';

    return async function exportPptx() {
      const actionState = resolveReadyState();
      if (!actionState || !actionState.canUseDeckActions) return false;

      let canonicalDeck;
      try {
        canonicalDeck = buildCanonicalDeck ? buildCanonicalDeck() : null;
      } catch (error) {
        setStatus('export-failed');
        return false;
      }
      if (!canonicalDeck || !Array.isArray(canonicalDeck.slides)) return false;

      const exportButton = documentRef && typeof documentRef.getElementById === 'function'
        ? documentRef.getElementById('exportPptxBtn')
        : null;
      if (exportButton) exportButton.disabled = true;
      setStatus('exporting');

      try {
        if (!pptxExport || typeof pptxExport.exportStudioPptx !== 'function') {
          setStatus('export-failed');
          return false;
        }

        const result = await pptxExport.exportStudioPptx({
          canonicalDeck,
          sourcePath,
          filename
        });
        if (!result || !result.success) {
          setStatus('export-failed');
          return false;
        }
        setStatus(result.warningCount > 0 ? 'exported-with-warnings' : 'exported');
        return true;
      } catch (error) {
        setStatus('export-failed');
        return false;
      } finally {
        if (exportButton) {
          exportButton.disabled = !resolveReadyState().canUseDeckActions;
        }
      }
    };
  }

  return {
    createStudioPdfExportAction,
    createStudioPptxExportAction
  };
});
