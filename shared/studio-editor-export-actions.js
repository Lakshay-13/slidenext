(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorExportActions = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function isStudioExportCanonicalDeckLike(value) {
    return !!value
      && typeof value === 'object'
      && !Array.isArray(value)
      && Array.isArray(value.slides);
  }

  function isValidStudioExportDeck(value, validator) {
    if (!value) return false;
    const validate = typeof validator === 'function'
      ? validator
      : isStudioExportCanonicalDeckLike;
    try {
      return validate(value) === true;
    } catch (err) {
      return false;
    }
  }

  function resolveStudioExportCanonicalDeck(options = {}) {
    const getPendingTransaction = typeof options.getPendingTransaction === 'function'
      ? options.getPendingTransaction
      : null;
    const buildMutationCanonicalDeck = typeof options.buildMutationCanonicalDeck === 'function'
      ? options.buildMutationCanonicalDeck
      : null;
    const getCanonicalDeckBaseline = typeof options.getCanonicalDeckBaseline === 'function'
      ? options.getCanonicalDeckBaseline
      : null;
    const buildCanonicalDeck = typeof options.buildCanonicalDeck === 'function'
      ? options.buildCanonicalDeck
      : null;
    const isCanonicalDeck = typeof options.isCanonicalDeck === 'function'
      ? options.isCanonicalDeck
      : null;
    const isValidDeck = (value) => isValidStudioExportDeck(value, isCanonicalDeck);

    let pendingTransaction = null;
    if (getPendingTransaction) {
      try {
        pendingTransaction = getPendingTransaction();
      } catch (error) {
        pendingTransaction = null;
      }
    }
    if (pendingTransaction && buildMutationCanonicalDeck) {
      try {
        const mutationCanonicalDeck = buildMutationCanonicalDeck();
        if (isValidDeck(mutationCanonicalDeck)) {
          return mutationCanonicalDeck;
        }
      } catch (error) {
        // Fall back to the live baseline when a legacy mutation rebuild fails.
      }
    }

    if (getCanonicalDeckBaseline) {
      try {
        const canonicalDeckBaseline = getCanonicalDeckBaseline();
        if (isValidDeck(canonicalDeckBaseline)) {
          return canonicalDeckBaseline;
        }
      } catch (error) {
        // Continue to the DOM-derived canonical builder.
      }
    }
    if (buildCanonicalDeck) {
      try {
        const canonicalDeck = buildCanonicalDeck();
        if (isValidDeck(canonicalDeck)) {
          return canonicalDeck;
        }
      } catch (error) {
        // Export actions fail closed when no usable canonical deck exists.
      }
    }
    return null;
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
    const buildMutationCanonicalDeck = typeof options.buildMutationCanonicalDeck === 'function'
      ? options.buildMutationCanonicalDeck
      : null;
    const getPendingTransaction = typeof options.getPendingTransaction === 'function'
      ? options.getPendingTransaction
      : null;
    const getCanonicalDeckBaseline = typeof options.getCanonicalDeckBaseline === 'function'
      ? options.getCanonicalDeckBaseline
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
    const resolveBaseHref = typeof options.resolveBaseHref === 'function'
      ? options.resolveBaseHref
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

      const canonicalDeck = resolveStudioExportCanonicalDeck({
        buildCanonicalDeck,
        buildMutationCanonicalDeck,
        getCanonicalDeckBaseline,
        getPendingTransaction,
        isCanonicalDeck
      });
      if (!isValidStudioExportDeck(canonicalDeck, isCanonicalDeck)
        || !Array.isArray(canonicalDeck.slides)
        || canonicalDeck.slides.length === 0) {
        return failPdfExport();
      }

      let pdfPreflight = { warnings: [] };
      if (typeof pdfExport.preflightStudioPdfExport === 'function') {
        try {
          pdfPreflight = pdfExport.preflightStudioPdfExport(canonicalDeck) || pdfPreflight;
        } catch (error) {
          return failPdfExport();
        }
        if (pdfPreflight.canExport === false) return failPdfExport();
      }
      const pdfWarnings = Array.isArray(pdfPreflight.warnings)
        ? pdfPreflight.warnings.filter((warning) => typeof warning === 'string' && warning.trim())
        : [];
      const pdfWarningCount = pdfWarnings.length;

      let html = '';
      try {
        html = buildPreviewHtml(canonicalDeck);
      } catch (error) {
        return failPdfExport();
      }
      if (!html) return failPdfExport();

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
        let baseHref = '';
        if (resolveBaseHref) {
          try {
            baseHref = resolveBaseHref() || '';
          } catch (error) {
            baseHref = '';
          }
        }
        const didOpenPrintFlow = pdfExport.openStudioPdfPrintWindow({
          html,
          slideCount: canonicalDeck.slides.length,
          onProgress: (progress) => {
            setStatus('exporting-pdf', progress);
          },
          ...pageDimensions,
          ...(typeof baseHref === 'string' && baseHref.trim() ? { baseHref } : {}),
          onPrintStart: () => {
            setStatus('pdf-printing');
          },
          onPrint: () => {
            if (pdfWarningCount > 0) {
              setStatus('pdf-exported-with-warnings', pdfWarningCount, pdfWarnings, false);
            } else {
              setStatus('pdf-exported');
            }
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
    const buildMutationCanonicalDeck = typeof options.buildMutationCanonicalDeck === 'function'
      ? options.buildMutationCanonicalDeck
      : null;
    const getPendingTransaction = typeof options.getPendingTransaction === 'function'
      ? options.getPendingTransaction
      : null;
    const getCanonicalDeckBaseline = typeof options.getCanonicalDeckBaseline === 'function'
      ? options.getCanonicalDeckBaseline
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

      const canonicalDeck = resolveStudioExportCanonicalDeck({
        buildCanonicalDeck,
        buildMutationCanonicalDeck,
        getCanonicalDeckBaseline,
        getPendingTransaction,
        isCanonicalDeck
      });
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
    resolveStudioExportCanonicalDeck,
    createStudioPdfExportAction,
    createStudioPptxExportAction
  };
});
