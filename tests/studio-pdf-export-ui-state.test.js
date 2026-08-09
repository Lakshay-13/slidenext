const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const exportActions = require('../shared/studio-editor-export-actions.js');
const exportController = require('../shared/studio-editor-export-controller.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

function extractFunctionSource(fileContent, startMarker, endMarker) {
  const start = fileContent.indexOf(startMarker);
  assert.notEqual(start, -1, `Missing start marker: ${startMarker}`);
  const end = fileContent.indexOf(endMarker, start);
  assert.notEqual(end, -1, `Missing end marker: ${endMarker}`);
  return fileContent.slice(start, end);
}

function loadExportPdfAction(fileContent, context) {
  const exportPdfSource = extractFunctionSource(
    fileContent,
    'function exportPdf() {',
    '\n\n    function launchPreview() {'
  );
  context.studioEditorExportController = exportController.createStudioEditorExportController({
    exportActions,
    resolveReadyState: () => context.resolveCurrentStudioDeckReadyActionState(),
    buildPreviewHtml: () => (
      typeof context.buildEditorPreviewHtml === 'function'
        ? context.buildEditorPreviewHtml()
        : ''
    ),
    buildCanonicalDeck: () => (
      typeof context.buildEditorCanonicalDeck === 'function'
        ? context.buildEditorCanonicalDeck()
        : null
    ),
    pdfExport: context.SlideNextStudioPdfExport,
    documentRef: context.document,
    setStatus: (...args) => {
      const handler = context.setStudioAutoSaveStatusWithWarningCount || context.setStudioAutoSaveStatus;
      return typeof handler === 'function' ? handler(...args) : undefined;
    }
  });
  vm.createContext(context);
  vm.runInContext(exportPdfSource, context);
}

test('exportPdf delegates a ready deck to the shared browser print exporter', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const calls = [];
  const statusCalls = [];
  const exportButton = { disabled: false };
  const context = {
    SlideNextStudioPdfExport: {
      openStudioPdfPrintWindow(options) {
        calls.push(['openStudioPdfPrintWindow', options]);
        options.onPrint();
        return true;
      }
    },
    buildEditorPreviewHtml() {
      calls.push(['buildEditorPreviewHtml']);
      return '<html><body><div class="slide">A</div></body></html>';
    },
    buildEditorCanonicalDeck() {
      return { slides: [{ id: 'slide-1' }] };
    },
    document: {
      getElementById(id) {
        return id === 'exportPdfBtn' ? exportButton : null;
      }
    },
    setStudioAutoSaveStatus(state) {
      statusCalls.push(state);
    },
    resolveCurrentStudioDeckReadyActionState() {
      return { canUseDeckActions: true };
    }
  };

  loadExportPdfAction(fileContent, context);

  assert.equal(context.exportPdf(), true);
  assert.deepEqual(JSON.parse(JSON.stringify(calls)), [
    ['buildEditorPreviewHtml'],
    ['openStudioPdfPrintWindow', {
      html: '<html><body><div class="slide">A</div></body></html>',
      slideCount: 1
    }]
  ]);
  assert.deepEqual(statusCalls, ['exporting-pdf', 'pdf-exported']);
  assert.equal(exportButton.disabled, false);
});

test('exportPdf keeps the button disabled until the async print flow completes', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const statusCalls = [];
  const exportButton = { disabled: false };
  let printOptions;
  const context = {
    SlideNextStudioPdfExport: {
      openStudioPdfPrintWindow(options) {
        printOptions = options;
        return true;
      }
    },
    buildEditorPreviewHtml() {
      return '<html><body><div class="slide">A</div></body></html>';
    },
    buildEditorCanonicalDeck() {
      return { slides: [{ id: 'slide-1' }] };
    },
    document: {
      getElementById(id) {
        return id === 'exportPdfBtn' ? exportButton : null;
      }
    },
    setStudioAutoSaveStatus(state) {
      statusCalls.push(state);
    },
    resolveCurrentStudioDeckReadyActionState() {
      return { canUseDeckActions: true };
    }
  };

  loadExportPdfAction(fileContent, context);

  assert.equal(context.exportPdf(), true);
  assert.equal(exportButton.disabled, true);
  assert.deepEqual(statusCalls, ['exporting-pdf']);

  printOptions.onPrint();

  assert.equal(exportButton.disabled, false);
  assert.deepEqual(statusCalls, ['exporting-pdf', 'pdf-exported']);
});

test('exportPdf forwards canonical layout dimensions when the shared resolver is available', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const calls = [];
  let canonicalDeckBuilds = 0;
  const context = {
    SlideNextStudioPdfExport: {
      resolveStudioPdfPageDimensions(deck) {
        calls.push(['resolveStudioPdfPageDimensions', deck]);
        return { pageWidth: '1280px', pageHeight: '720px' };
      },
      openStudioPdfPrintWindow(options) {
        calls.push(['openStudioPdfPrintWindow', options]);
        return true;
      }
    },
    buildEditorCanonicalDeck() {
      canonicalDeckBuilds += 1;
      return {
        layout: { size: { width: 1280, height: 720, unit: 'px' } },
        slides: [{ id: 'slide-1' }]
      };
    },
    buildEditorPreviewHtml() {
      return '<html><body><div class="slide">A</div></body></html>';
    },
    resolveCurrentStudioDeckReadyActionState() {
      return { canUseDeckActions: true };
    }
  };

  loadExportPdfAction(fileContent, context);

  assert.equal(context.exportPdf(), true);
  assert.deepEqual(JSON.parse(JSON.stringify(calls)), [
    ['resolveStudioPdfPageDimensions', {
      layout: { size: { width: 1280, height: 720, unit: 'px' } },
      slides: [{ id: 'slide-1' }]
    }],
    ['openStudioPdfPrintWindow', {
      html: '<html><body><div class="slide">A</div></body></html>',
      slideCount: 1,
      pageWidth: '1280px',
      pageHeight: '720px'
    }]
  ]);
  assert.equal(canonicalDeckBuilds, 1);
});

test('exportPdf skips preview generation when deck actions are unavailable or canonical deck is empty', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  let buildCalls = 0;
  const context = {
    SlideNextStudioPdfExport: {
      openStudioPdfPrintWindow() {
        throw new Error('popup exporter should not run');
      }
    },
    buildEditorPreviewHtml() {
      buildCalls += 1;
      return '';
    },
    resolveCurrentStudioDeckReadyActionState() {
      return { canUseDeckActions: false };
    }
  };

  loadExportPdfAction(fileContent, context);

  assert.equal(context.exportPdf(), false);
  assert.equal(buildCalls, 0);

  context.resolveCurrentStudioDeckReadyActionState = () => ({ canUseDeckActions: true });
  assert.equal(context.exportPdf(), false);
  assert.equal(buildCalls, 0);
});

test('exportPdf fails closed for an empty canonical deck without opening a popup', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const statusCalls = [];
  const context = {
    SlideNextStudioPdfExport: {
      openStudioPdfPrintWindow() {
        throw new Error('empty deck should not open a print popup');
      }
    },
    buildEditorCanonicalDeck() {
      return { slides: [] };
    },
    buildEditorPreviewHtml() {
      return '<html><body><div class="slide">A</div></body></html>';
    },
    setStudioAutoSaveStatus(state) {
      statusCalls.push(state);
    },
    resolveCurrentStudioDeckReadyActionState() {
      return { canUseDeckActions: true };
    }
  };

  loadExportPdfAction(fileContent, context);

  assert.equal(context.exportPdf(), false);
  assert.deepEqual(statusCalls, ['pdf-export-failed']);
});

test('exportPdf fails closed when no canonical deck is available for slide-count validation', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const statusCalls = [];
  const context = {
    SlideNextStudioPdfExport: {
      openStudioPdfPrintWindow() {
        throw new Error('missing canonical deck should fail before opening a popup');
      }
    },
    buildEditorPreviewHtml() {
      return '<html><body><div class="slide">A</div></body></html>';
    },
    setStudioAutoSaveStatus(state) {
      statusCalls.push(state);
    },
    resolveCurrentStudioDeckReadyActionState() {
      return { canUseDeckActions: true };
    }
  };

  loadExportPdfAction(fileContent, context);

  assert.equal(context.exportPdf(), false);
  assert.deepEqual(statusCalls, ['pdf-export-failed']);
});

test('exportPdf reports preview renderer failures instead of throwing', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const statusCalls = [];
  const context = {
    SlideNextStudioPdfExport: {
      openStudioPdfPrintWindow() {
        throw new Error('print exporter should not run');
      }
    },
    buildEditorPreviewHtml() {
      throw new Error('preview render failed');
    },
    setStudioAutoSaveStatus(state) {
      statusCalls.push(state);
    },
    resolveCurrentStudioDeckReadyActionState() {
      return { canUseDeckActions: true };
    }
  };

  loadExportPdfAction(fileContent, context);

  assert.doesNotThrow(() => assert.equal(context.exportPdf(), false));
  assert.deepEqual(statusCalls, ['pdf-export-failed']);
});

test('exportPdf reports popup failures and restores the export button', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const statusCalls = [];
  const exportButton = { disabled: false };
  const context = {
    SlideNextStudioPdfExport: {
      openStudioPdfPrintWindow() {
        return false;
      }
    },
    buildEditorPreviewHtml() {
      return '<html><body><div class="slide">A</div></body></html>';
    },
    buildEditorCanonicalDeck() {
      return { slides: [{ id: 'slide-1' }] };
    },
    document: {
      getElementById(id) {
        return id === 'exportPdfBtn' ? exportButton : null;
      }
    },
    setStudioAutoSaveStatus(state) {
      statusCalls.push(state);
    },
    resolveCurrentStudioDeckReadyActionState() {
      return { canUseDeckActions: true };
    }
  };

  loadExportPdfAction(fileContent, context);

  assert.equal(context.exportPdf(), false);
  assert.deepEqual(statusCalls, ['exporting-pdf', 'pdf-export-failed']);
  assert.equal(exportButton.disabled, false);
});
