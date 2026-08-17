const test = require('node:test');
const assert = require('node:assert/strict');

const exportActions = require('../shared/studio-editor-export-actions.js');

function isCanonicalDeck(value) {
  return !!value && value.kind === 'slidenext.deck' && Array.isArray(value.slides);
}

test('PDF export prefers the generalized server exporter when available', async () => {
  const statuses = [];
  const calls = [];
  const exportPdf = exportActions.createStudioPdfExportAction({
    resolveReadyState: () => ({ canUseDeckActions: true }),
    buildPreviewHtml: () => {
      throw new Error('server export should not render popup html');
    },
    buildCanonicalDeck: () => ({ slides: [{ id: 'slide-1' }] }),
    sourcePath: '/presentations/demo/index.html',
    pdfExport: {
      async exportStudioPdf(options) {
        calls.push(options);
        options.onProgress({ phase: 'response', completed: 2, total: 4, percent: 50 });
        return {
          success: true,
          warningCount: 1,
          warnings: ['PDF node image-1 references missing asset "hero"'],
          warningsTruncated: false
        };
      },
      openStudioPdfPrintWindow() {
        throw new Error('popup exporter should not run');
      }
    },
    setStatus: (...args) => statuses.push(args)
  });

  assert.equal(await exportPdf(), true);
  const { onProgress, ...pdfOptions } = calls[0];
  assert.equal(typeof onProgress, 'function');
  assert.deepEqual(pdfOptions, {
    canonicalDeck: { slides: [{ id: 'slide-1' }] },
    sourcePath: '/presentations/demo/index.html'
  });
  assert.deepEqual(statuses, [
    ['exporting-pdf'],
    ['exporting-pdf', { phase: 'response', completed: 2, total: 4, percent: 50 }],
    ['pdf-exported-with-warnings', 1, ['PDF node image-1 references missing asset "hero"'], false]
  ]);
});

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

test('PDF export forwards server failure details to the status callback', async () => {
  const statuses = [];
  const exportPdf = exportActions.createStudioPdfExportAction({
    resolveReadyState: () => ({ canUseDeckActions: true }),
    buildCanonicalDeck: () => ({ slides: [{ id: 'slide-1' }] }),
    pdfExport: {
      async exportStudioPdf() {
        return { success: false, error: 'Cannot export an empty deck' };
      }
    },
    setStatus: (...args) => statuses.push(args)
  });

  assert.equal(await exportPdf(), false);
  assert.deepEqual(statuses, [
    ['exporting-pdf'],
    ['pdf-export-failed', 'Cannot export an empty deck']
  ]);
});

test('PDF export rejects a duplicate request while the server export is pending', async () => {
  let resolveExport;
  let exportCalls = 0;
  const exportPdf = exportActions.createStudioPdfExportAction({
    resolveReadyState: () => ({ canUseDeckActions: true }),
    buildCanonicalDeck: () => ({ slides: [{ id: 'slide-1' }] }),
    pdfExport: {
      exportStudioPdf() {
        exportCalls += 1;
        return new Promise((resolve) => {
          resolveExport = () => resolve({ success: true });
        });
      }
    }
  });

  const firstRequest = exportPdf();
  assert.equal(exportPdf(), false);
  assert.equal(exportCalls, 1);

  resolveExport();
  assert.equal(await firstRequest, true);
  const secondRequest = exportPdf();
  assert.equal(exportCalls, 2);
  resolveExport();
  assert.equal(await secondRequest, true);
});

test('PDF print export stays active until the print window completes', () => {
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
    }
  });

  assert.equal(exportPdf(), true);
  assert.equal(exportPdf(), false);
  printOptions.onPrint();
  assert.equal(exportPdf(), true);
});

test('PDF export preserves preflight warnings when the server response omits warning details', async () => {
  const statuses = [];
  const exportPdf = exportActions.createStudioPdfExportAction({
    resolveReadyState: () => ({ canUseDeckActions: true }),
    buildCanonicalDeck: () => ({ slides: [{ id: 'slide-1' }] }),
    pdfExport: {
      preflightStudioPdfExport() {
        return {
          canExport: true,
          warnings: ['PDF node image-1 references missing asset "hero"']
        };
      },
      async exportStudioPdf() {
        return { success: true, warningCount: 0, warnings: [] };
      }
    },
    setStatus: (...args) => statuses.push(args)
  });

  assert.equal(await exportPdf(), true);
  assert.deepEqual(statuses, [
    ['exporting-pdf'],
    [
      'pdf-exported-with-warnings',
      1,
      ['PDF node image-1 references missing asset "hero"'],
      false
    ]
  ]);
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

test('export canonical resolution prefers a fresh current-document rebuild over a stale baseline', () => {
  const currentDeck = { slides: [{ id: 'current-slide' }] };
  const staleBaseline = { slides: [{ id: 'stale-slide' }] };
  let baselineCalls = 0;
  let rebuildCalls = 0;

  const resolvedDeck = exportActions.resolveStudioExportCanonicalDeck({
    sourceDocument: { id: 'editor-document' },
    getPendingTransaction: () => ({ id: 'pending-transaction' }),
    buildMutationCanonicalDeck: () => null,
    buildCanonicalDeck: () => {
      rebuildCalls += 1;
      return currentDeck;
    },
    getCanonicalDeckBaseline: () => {
      baselineCalls += 1;
      return staleBaseline;
    }
  });

  assert.equal(resolvedDeck, currentDeck);
  assert.equal(rebuildCalls, 1);
  assert.equal(baselineCalls, 0);
});

test('PDF and PPTX exports prefer a pending canonical sidecar before rebuilding', async () => {
  const sourceDocument = { id: 'editor-document' };
  const pendingDeck = { slides: [{ id: 'pending-slide' }] };
  const rebuiltDeck = { slides: [{ id: 'rebuilt-slide' }] };
  let rebuildCalls = 0;
  let pdfDeck = null;
  let pptxDeck = null;
  const sharedOptions = {
    resolveReadyState: () => ({ canUseDeckActions: true }),
    getSourceDocument: () => sourceDocument,
    getPendingCanonicalDeck(documentRef) {
      assert.equal(documentRef, sourceDocument);
      return pendingDeck;
    },
    buildCanonicalDeck: () => {
      rebuildCalls += 1;
      return rebuiltDeck;
    }
  };
  const pdfExport = exportActions.createStudioPdfExportAction({
    ...sharedOptions,
    buildPreviewHtml: (canonicalDeck) => {
      pdfDeck = canonicalDeck;
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
  assert.equal(pdfDeck, pendingDeck);
  assert.equal(pptxDeck, pendingDeck);
  assert.equal(rebuildCalls, 0);
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

test('PPTX export forwards exporter failure details to the status callback', async () => {
  const statuses = [];
  const exportPptx = exportActions.createStudioPptxExportAction({
    resolveReadyState: () => ({ canUseDeckActions: true }),
    buildCanonicalDeck: () => ({ slides: [{ id: 'slide-1' }] }),
    pptxExport: {
      async exportStudioPptx() {
        return { success: false, error: 'PptxGenJS is unavailable' };
      }
    },
    setStatus: (...args) => statuses.push(args)
  });

  assert.equal(await exportPptx(), false);
  assert.deepEqual(statuses, [
    ['exporting'],
    ['export-failed', 'PptxGenJS is unavailable']
  ]);
});

test('PPTX export reuses a pending request instead of starting a duplicate export', async () => {
  let resolveExport;
  let exportCalls = 0;
  const exportPptx = exportActions.createStudioPptxExportAction({
    resolveReadyState: () => ({ canUseDeckActions: true }),
    buildCanonicalDeck: () => ({ slides: [{ id: 'slide-1' }] }),
    pptxExport: {
      exportStudioPptx() {
        exportCalls += 1;
        return new Promise((resolve) => {
          resolveExport = () => resolve({ success: true });
        });
      }
    }
  });

  const firstRequest = exportPptx();
  const duplicateRequest = exportPptx();
  assert.equal(firstRequest, duplicateRequest);
  assert.equal(exportCalls, 1);

  resolveExport();
  assert.equal(await firstRequest, true);
  assert.equal(await duplicateRequest, true);

  const secondRequest = exportPptx();
  assert.equal(exportCalls, 2);
  resolveExport();
  assert.equal(await secondRequest, true);
});

test('PPTX export derives warning state from warning details when the count is absent', async () => {
  const statuses = [];
  const exportPptx = exportActions.createStudioPptxExportAction({
    resolveReadyState: () => ({ canUseDeckActions: true }),
    buildCanonicalDeck: () => ({ slides: [{ id: 'slide-1' }] }),
    pptxExport: {
      async exportStudioPptx() {
        return {
          success: true,
          warnings: ['Node text-1 uses unsupported CSS: transform']
        };
      }
    },
    setStatus: (...args) => statuses.push(args)
  });

  assert.equal(await exportPptx(), true);
  assert.deepEqual(statuses, [
    ['exporting'],
    [
      'exported-with-warnings',
      1,
      ['Node text-1 uses unsupported CSS: transform'],
      false
    ]
  ]);
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

test('export cleanup fails closed when the editor ready-state reader throws after the action starts', async () => {
  let readyStateCalls = 0;
  const pdfButton = { disabled: false, setAttribute() {} };
  const pptxButton = { disabled: false, setAttribute() {} };
  const documentRef = {
    getElementById(id) {
      return id === 'exportPdfBtn' ? pdfButton : pptxButton;
    }
  };
  const resolveReadyState = () => {
    readyStateCalls += 1;
    if (readyStateCalls > 1) throw new Error('editor session replaced');
    return { canUseDeckActions: true };
  };

  const exportPdf = exportActions.createStudioPdfExportAction({
    resolveReadyState,
    documentRef,
    buildPreviewHtml: () => '<html><body><div class="slide">A</div></body></html>',
    buildCanonicalDeck: () => ({ slides: [{ id: 'slide-1' }] }),
    pdfExport: {
      openStudioPdfPrintWindow(options) {
        options.onPrint();
        return true;
      }
    }
  });
  assert.doesNotThrow(() => exportPdf());

  readyStateCalls = 0;
  const exportPptx = exportActions.createStudioPptxExportAction({
    resolveReadyState,
    documentRef,
    buildCanonicalDeck: () => ({ slides: [{ id: 'slide-1' }] }),
    pptxExport: {
      async exportStudioPptx() {
        return { success: true };
      }
    }
  });
  assert.equal(await exportPptx(), true);
  assert.equal(pdfButton.disabled, true);
  assert.equal(pptxButton.disabled, true);
});
