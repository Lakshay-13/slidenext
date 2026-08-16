const test = require('node:test');
const assert = require('node:assert/strict');

const exportController = require('../shared/studio-editor-export-controller.js');

test('export controller delegates PDF with current shared dependencies', () => {
  const calls = [];
  const isCanonicalDeck = () => true;
  const buildMutationCanonicalDeck = () => ({ slides: [{ id: 'mutation-slide' }] });
  const getPendingTransaction = () => ({ id: 'pending-transaction' });
  const getCanonicalDeckBaseline = () => ({ slides: [{ id: 'live-slide' }] });
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
    buildMutationCanonicalDeck,
    getPendingTransaction,
    getCanonicalDeckBaseline,
    isCanonicalDeck,
    resolvePdfBaseHref: () => '/presentations/demo/',
    resolveSourcePath: () => '/presentations/demo/index.html',
    getSourceDocument: () => ({ id: 'editor-document' }),
    pdfExport: { openStudioPdfPrintWindow() {} },
    documentRef: {},
    setStatus() {}
  });

  assert.equal(controller.exportPdf(), true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].buildPreviewHtml(), '<html></html>');
  assert.equal(calls[0].buildCanonicalDeck().slides.length, 1);
  assert.equal(calls[0].buildMutationCanonicalDeck, buildMutationCanonicalDeck);
  assert.equal(calls[0].getPendingTransaction, getPendingTransaction);
  assert.equal(calls[0].getCanonicalDeckBaseline, getCanonicalDeckBaseline);
  assert.equal(typeof calls[0].getSourceDocument, 'function');
  assert.equal(calls[0].isCanonicalDeck, isCanonicalDeck);
  assert.equal(calls[0].resolveBaseHref(), '/presentations/demo/');
  assert.equal(calls[0].sourcePath, '/presentations/demo/index.html');
  assert.equal(calls[0].pdfExport.openStudioPdfPrintWindow instanceof Function, true);
});

test('export controller resolves current PPTX path and filename on each call', async () => {
  const calls = [];
  const isCanonicalDeck = () => true;
  const buildMutationCanonicalDeck = () => ({ slides: [{ id: 'mutation-slide' }] });
  const getPendingTransaction = () => ({ id: 'pending-transaction' });
  const getCanonicalDeckBaseline = () => ({ slides: [{ id: 'live-slide' }] });
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
    buildMutationCanonicalDeck,
    getPendingTransaction,
    getCanonicalDeckBaseline,
    isCanonicalDeck,
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
  assert.equal(calls[0].isCanonicalDeck, isCanonicalDeck);
  assert.equal(calls[0].buildMutationCanonicalDeck, buildMutationCanonicalDeck);
  assert.equal(calls[0].getPendingTransaction, getPendingTransaction);
  assert.equal(calls[0].getCanonicalDeckBaseline, getCanonicalDeckBaseline);
});

test('export controller fails closed when export actions are unavailable', async () => {
  const controller = exportController.createStudioEditorExportController({
    exportActions: null
  });

  assert.equal(controller.exportPdf(), false);
  assert.equal(await controller.exportPptx(), false);
});

test('export controller binds PDF and PPTX buttons without inline handlers', async () => {
  const calls = [];
  const buttons = {
    exportPdfBtn: {
      listeners: {},
      addEventListener(type, handler) {
        this.listeners[type] = handler;
      }
    },
    exportPptxBtn: {
      listeners: {},
      addEventListener(type, handler) {
        this.listeners[type] = handler;
      }
    }
  };
  const controller = exportController.createStudioEditorExportController({
    exportActions: {
      createStudioPdfExportAction() {
        return () => {
          calls.push('pdf');
          return true;
        };
      },
      createStudioPptxExportAction() {
        return async () => {
          calls.push('pptx');
          return true;
        };
      }
    },
    documentRef: {
      getElementById(id) {
        return buttons[id] || null;
      }
    }
  });

  assert.deepEqual(
    controller.bindStudioEditorExportButtons({ documentRef: controllerDocument(buttons) }),
    { pdf: true, pptx: true }
  );
  assert.equal(typeof buttons.exportPdfBtn.listeners.click, 'function');
  assert.equal(typeof buttons.exportPptxBtn.listeners.click, 'function');
  assert.equal(buttons.exportPdfBtn.listeners.click(), true);
  assert.equal(await buttons.exportPptxBtn.listeners.click(), true);
  assert.deepEqual(calls, ['pdf', 'pptx']);
});

test('export controller reuses button bindings without duplicate exports', () => {
  const buttons = Object.fromEntries(['exportPdfBtn', 'exportPptxBtn'].map((id) => [id, {
    listeners: [],
    addEventListener(type, handler) {
      this.listeners.push({ type, handler });
    }
  }]));
  const controller = exportController.createStudioEditorExportController({
    exportActions: {
      createStudioPdfExportAction() {
        return () => true;
      },
      createStudioPptxExportAction() {
        return async () => true;
      }
    }
  });
  const documentRef = controllerDocument(buttons);

  controller.bindStudioEditorExportButtons({ documentRef });
  controller.bindStudioEditorExportButtons({ documentRef });

  assert.equal(buttons.exportPdfBtn.listeners.length, 1);
  assert.equal(buttons.exportPptxBtn.listeners.length, 1);
});

function controllerDocument(buttons) {
  return {
    getElementById(id) {
      return buttons[id] || null;
    }
  };
}
