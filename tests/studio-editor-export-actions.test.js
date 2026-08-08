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
