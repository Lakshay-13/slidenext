const test = require('node:test');
const assert = require('node:assert/strict');

const exportActions = require('../shared/studio-editor-export-actions.js');

function isCanonicalDeck(value) {
  return !!value && value.kind === 'slidenext.deck' && Array.isArray(value.slides);
}

test('PDF export rejects malformed canonical decks before opening print flow', () => {
  let openCalls = 0;
  const statuses = [];
  const exportPdf = exportActions.createStudioPdfExportAction({
    resolveReadyState: () => ({ canUseDeckActions: true }),
    buildPreviewHtml: () => '<html><body><div class="slide">A</div></body></html>',
    buildCanonicalDeck: () => ({ invalid: true }),
    isCanonicalDeck,
    pdfExport: {
      openStudioPdfPrintWindow() {
        openCalls += 1;
        return true;
      }
    },
    setStatus: (status) => statuses.push(status)
  });

  assert.equal(exportPdf(), false);
  assert.equal(openCalls, 0);
  assert.deepEqual(statuses, ['pdf-export-failed']);
});

test('PDF export forwards resource progress through the existing status callback', () => {
  const statuses = [];
  let printOptions = null;
  const exportPdf = exportActions.createStudioPdfExportAction({
    resolveReadyState: () => ({ canUseDeckActions: true }),
    buildPreviewHtml: () => '<html><body><div class="slide">A</div></body></html>',
    buildCanonicalDeck: () => ({ slides: [{ id: 'slide-1' }] }),
    pdfExport: {
      openStudioPdfPrintWindow(options) {
        printOptions = options;
        return true;
      }
    },
    setStatus: (...args) => statuses.push(args)
  });

  assert.equal(exportPdf(), true);
  printOptions.onProgress({ phase: 'resources', completed: 1, total: 2, percent: 50 });
  printOptions.onPrint();
  assert.deepEqual(statuses, [
    ['exporting-pdf'],
    ['exporting-pdf', { phase: 'resources', completed: 1, total: 2, percent: 50 }],
    ['pdf-exported']
  ]);
});

test('PDF export builds preview html from the validated canonical snapshot', () => {
  const canonicalDeck = { slides: [{ id: 'slide-1' }] };
  let previewDeck = null;
  const exportPdf = exportActions.createStudioPdfExportAction({
    resolveReadyState: () => ({ canUseDeckActions: true }),
    buildPreviewHtml(nextCanonicalDeck) {
      previewDeck = nextCanonicalDeck;
      return '<html><body><div class="slide">A</div></body></html>';
    },
    buildCanonicalDeck: () => canonicalDeck,
    pdfExport: {
      openStudioPdfPrintWindow() {
        return true;
      }
    }
  });

  assert.equal(exportPdf(), true);
  assert.equal(previewDeck, canonicalDeck);
});

test('PDF export forwards the current presentation base href to the print flow', () => {
  let printOptions = null;
  const exportPdf = exportActions.createStudioPdfExportAction({
    resolveReadyState: () => ({ canUseDeckActions: true }),
    resolveBaseHref: () => '/presentations/demo/',
    buildPreviewHtml: () => '<html><body><div class="slide">A</div></body></html>',
    buildCanonicalDeck: () => ({ slides: [{ id: 'slide-1' }] }),
    pdfExport: {
      openStudioPdfPrintWindow(options) {
        printOptions = options;
        return true;
      }
    }
  });

  assert.equal(exportPdf(), true);
  assert.equal(printOptions.baseHref, '/presentations/demo/');
});

test('PDF and PPTX exports prefer a valid live canonical baseline before rebuilding', async () => {
  const liveDeck = { slides: [{ id: 'live-slide' }] };
  const rebuiltDeck = { slides: [{ id: 'rebuilt-slide' }] };
  let buildCalls = 0;
  let previewDeck = null;
  let pptxDeck = null;
  const pdfExport = exportActions.createStudioPdfExportAction({
    resolveReadyState: () => ({ canUseDeckActions: true }),
    getCanonicalDeckBaseline: () => liveDeck,
    buildCanonicalDeck: () => {
      buildCalls += 1;
      return rebuiltDeck;
    },
    buildPreviewHtml: (canonicalDeck) => {
      previewDeck = canonicalDeck;
      return '<html><body><div class="slide">A</div></body></html>';
    },
    pdfExport: {
      openStudioPdfPrintWindow() {
        return true;
      }
    }
  });
  const pptxExport = exportActions.createStudioPptxExportAction({
    resolveReadyState: () => ({ canUseDeckActions: true }),
    getCanonicalDeckBaseline: () => liveDeck,
    buildCanonicalDeck: () => {
      buildCalls += 1;
      return rebuiltDeck;
    },
    pptxExport: {
      async exportStudioPptx({ canonicalDeck }) {
        pptxDeck = canonicalDeck;
        return { success: true };
      }
    }
  });

  assert.equal(pdfExport(), true);
  assert.equal(await pptxExport(), true);
  assert.equal(previewDeck, liveDeck);
  assert.equal(pptxDeck, liveDeck);
  assert.equal(buildCalls, 0);
});

test('PDF and PPTX exports rebuild from the current DOM while a transaction is pending', async () => {
  const liveDeck = { slides: [{ id: 'live-slide' }] };
  const mutationDeck = { slides: [{ id: 'mutation-slide' }] };
  const fallbackDeck = { slides: [{ id: 'fallback-slide' }] };
  let mutationBuildCalls = 0;
  let baselineCalls = 0;
  let fallbackBuildCalls = 0;
  let previewDeck = null;
  let pptxDeck = null;
  const sharedOptions = {
    resolveReadyState: () => ({ canUseDeckActions: true }),
    getPendingTransaction: () => ({ id: 'pending-transaction' }),
    getCanonicalDeckBaseline: () => {
      baselineCalls += 1;
      return liveDeck;
    },
    buildMutationCanonicalDeck: () => {
      mutationBuildCalls += 1;
      return mutationDeck;
    },
    buildCanonicalDeck: () => {
      fallbackBuildCalls += 1;
      return fallbackDeck;
    }
  };
  const pdfExport = exportActions.createStudioPdfExportAction({
    ...sharedOptions,
    buildPreviewHtml: (canonicalDeck) => {
      previewDeck = canonicalDeck;
      return '<html><body><div class="slide">A</div></body></html>';
    },
    pdfExport: {
      openStudioPdfPrintWindow() {
        return true;
      }
    }
  });
  const pptxExport = exportActions.createStudioPptxExportAction({
    ...sharedOptions,
    pptxExport: {
      async exportStudioPptx({ canonicalDeck }) {
        pptxDeck = canonicalDeck;
        return { success: true };
      }
    }
  });

  assert.equal(pdfExport(), true);
  assert.equal(await pptxExport(), true);
  assert.equal(previewDeck, mutationDeck);
  assert.equal(pptxDeck, mutationDeck);
  assert.equal(mutationBuildCalls, 2);
  assert.equal(baselineCalls, 0);
  assert.equal(fallbackBuildCalls, 0);
});

test('PPTX export rejects malformed canonical decks before invoking exporter', async () => {
  let exportCalls = 0;
  const statuses = [];
  const exportPptx = exportActions.createStudioPptxExportAction({
    resolveReadyState: () => ({ canUseDeckActions: true }),
    buildCanonicalDeck: () => ({ invalid: true }),
    isCanonicalDeck,
    pptxExport: {
      async exportStudioPptx() {
        exportCalls += 1;
        return { success: true };
      }
    },
    setStatus: (status) => statuses.push(status)
  });

  assert.equal(await exportPptx(), false);
  assert.equal(exportCalls, 0);
  assert.deepEqual(statuses, ['export-failed']);
});

test('PDF and PPTX exports use structural canonical validation without an injected validator', async () => {
  let pdfOpenCalls = 0;
  let pptxExportCalls = 0;
  const malformedDeck = { invalid: true };
  const validDeck = {
    slides: [{ id: 'slide-1' }]
  };
  const pdfExport = exportActions.createStudioPdfExportAction({
    resolveReadyState: () => ({ canUseDeckActions: true }),
    buildPreviewHtml: () => '<html><body><div class="slide">A</div></body></html>',
    buildCanonicalDeck: () => malformedDeck,
    pdfExport: {
      openStudioPdfPrintWindow() {
        pdfOpenCalls += 1;
        return true;
      }
    }
  });
  const pptxExport = exportActions.createStudioPptxExportAction({
    resolveReadyState: () => ({ canUseDeckActions: true }),
    buildCanonicalDeck: () => malformedDeck,
    pptxExport: {
      async exportStudioPptx() {
        pptxExportCalls += 1;
        return { success: true };
      }
    }
  });

  assert.equal(pdfExport(), false);
  assert.equal(await pptxExport(), false);
  assert.equal(pdfOpenCalls, 0);
  assert.equal(pptxExportCalls, 0);

  const validPdfExport = exportActions.createStudioPdfExportAction({
    resolveReadyState: () => ({ canUseDeckActions: true }),
    buildPreviewHtml: () => '<html><body><div class="slide">A</div></body></html>',
    buildCanonicalDeck: () => validDeck,
    pdfExport: {
      openStudioPdfPrintWindow() {
        return true;
      }
    }
  });
  const validPptxExport = exportActions.createStudioPptxExportAction({
    resolveReadyState: () => ({ canUseDeckActions: true }),
    buildCanonicalDeck: () => validDeck,
    pptxExport: {
      async exportStudioPptx() {
        return { success: true };
      }
    }
  });

  assert.equal(validPdfExport(), true);
  assert.equal(await validPptxExport(), true);
});
