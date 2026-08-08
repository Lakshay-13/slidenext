(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorExportActions = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function isValidStudioExportDeck(value, validator) {
    if (!value) return false;
    if (typeof validator !== 'function') return true;
    try {
      return validator(value) === true;
    } catch (err) {
      return false;
    }
  }

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
    const isCanonicalDeck = typeof options.isCanonicalDeck === 'function'
      ? options.isCanonicalDeck
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

      let html = '';
      try {
        html = buildPreviewHtml();
      } catch (error) {
        return failPdfExport();
      }
      if (!html) return failPdfExport();

      if (!buildCanonicalDeck) return failPdfExport();

      let canonicalDeck = null;
      try {
        canonicalDeck = buildCanonicalDeck();
      } catch (error) {
        canonicalDeck = null;
      }
      if (!isValidStudioExportDeck(canonicalDeck, isCanonicalDeck)
        || !Array.isArray(canonicalDeck.slides)
        || canonicalDeck.slides.length === 0) {
        return failPdfExport();
      }

      const exportButton = documentRef && typeof documentRef.getElementById === 'function'
        ? documentRef.getElementById('exportPdfBtn')
        : null;
      let printFlowAccepted = false;
      const restoreExportButton = () => {
        if (exportButton) {
          exportButton.disabled = !resolveReadyState().canUseDeckActions;
        }
      };
      if (exportButton) exportButton.disabled = true;
      setStatus('exporting-pdf');
      try {
        let pageDimensions = {};
        if (typeof pdfExport.resolveStudioPdfPageDimensions === 'function') {
          try {
            pageDimensions = pdfExport.resolveStudioPdfPageDimensions(canonicalDeck);
          } catch (error) {
            pageDimensions = {};
          }
        }
        const didOpenPrintFlow = pdfExport.openStudioPdfPrintWindow({
          html,
          slideCount: canonicalDeck.slides.length,
          ...pageDimensions,
          onPrint: () => {
            setStatus('pdf-exported');
            restoreExportButton();
          },
          onError: () => {
            setStatus('pdf-export-failed');
            restoreExportButton();
          }
        });
        if (!didOpenPrintFlow) return failPdfExport();
        printFlowAccepted = true;
        return true;
      } catch (error) {
        return failPdfExport();
      } finally {
        if (!printFlowAccepted) restoreExportButton();
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
    const isCanonicalDeck = typeof options.isCanonicalDeck === 'function'
      ? options.isCanonicalDeck
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
      if (!isValidStudioExportDeck(canonicalDeck, isCanonicalDeck)
        || !Array.isArray(canonicalDeck.slides)
        || canonicalDeck.slides.length === 0) {
        setStatus('export-failed');
        return false;
      }

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
        setStatus(
          result.warningCount > 0 ? 'exported-with-warnings' : 'exported',
          result.warningCount,
          result.warnings,
          result.warningsTruncated
        );
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
