const test = require('node:test');
const assert = require('node:assert/strict');

const exportController = require('../shared/studio-editor-export-controller.js');

test('export controller delegates PDF with current shared dependencies', () => {
  const calls = [];
  const controller = exportController.createStudioEditorExportController({
    exportActions: {
      createStudioPdfExportAction(options) {
        calls.push(options);
        return () => true;
      }
    },
    resolveReadyState: () => ({ canUseDeckActions: true }),
    buildPreviewHtml: () => '<html></html>',
    buildCanonicalDeck: () => ({ slides: [{ id: 'slide-1' }] }),
    pdfExport: { openStudioPdfPrintWindow() {} },
    documentRef: {},
    setStatus() {}
  });

  assert.equal(controller.exportPdf(), true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].buildPreviewHtml(), '<html></html>');
  assert.equal(calls[0].buildCanonicalDeck().slides.length, 1);
  assert.equal(calls[0].pdfExport.openStudioPdfPrintWindow instanceof Function, true);
});

test('export controller resolves current PPTX path and filename on each call', async () => {
  const calls = [];
  let sourcePath = '/presentations/first/index.html';
  let filename = 'First.pptx';
  const controller = exportController.createStudioEditorExportController({
    exportActions: {
      createStudioPptxExportAction(options) {
        calls.push(options);
        return async () => true;
      }
    },
    resolveReadyState: () => ({ canUseDeckActions: true }),
    buildCanonicalDeck: () => ({ slides: [{ id: 'slide-1' }] }),
    resolveSourcePath: () => sourcePath,
    resolveFilename: () => filename
  });

  assert.equal(await controller.exportPptx(), true);
  sourcePath = '/presentations/second/index.html';
  filename = 'Second.pptx';
  assert.equal(await controller.exportPptx(), true);
  assert.deepEqual(
    calls.map((options) => [options.sourcePath, options.filename]),
    [
      ['/presentations/first/index.html', 'First.pptx'],
      ['/presentations/second/index.html', 'Second.pptx']
    ]
  );
});

test('export controller fails closed when export actions are unavailable', async () => {
  const controller = exportController.createStudioEditorExportController({
    exportActions: null
  });

  assert.equal(controller.exportPdf(), false);
  assert.equal(await controller.exportPptx(), false);
});
