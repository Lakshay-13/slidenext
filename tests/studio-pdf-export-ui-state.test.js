const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

function extractFunctionSource(fileContent, startMarker, endMarker) {
  const start = fileContent.indexOf(startMarker);
  assert.notEqual(start, -1, `Missing start marker: ${startMarker}`);
  const end = fileContent.indexOf(endMarker, start);
  assert.notEqual(end, -1, `Missing end marker: ${endMarker}`);
  return fileContent.slice(start, end);
}

test('exportPdf delegates a ready deck to the shared browser print exporter', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const exportPdfSource = extractFunctionSource(
    fileContent,
    'function exportPdf() {',
    '\n\n    function launchPreview() {'
  );
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

  vm.createContext(context);
  vm.runInContext(exportPdfSource, context);

  assert.equal(context.exportPdf(), true);
  assert.deepEqual(JSON.parse(JSON.stringify(calls)), [
    ['buildEditorPreviewHtml'],
    ['openStudioPdfPrintWindow', {
      html: '<html><body><div class="slide">A</div></body></html>'
    }]
  ]);
  assert.deepEqual(statusCalls, ['exporting-pdf', 'pdf-exported']);
  assert.equal(exportButton.disabled, false);
});

test('exportPdf forwards canonical layout dimensions when the shared resolver is available', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const exportPdfSource = extractFunctionSource(
    fileContent,
    'function exportPdf() {',
    '\n\n    function launchPreview() {'
  );
  const calls = [];
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
      return { layout: { size: { width: 1280, height: 720, unit: 'px' } } };
    },
    buildEditorPreviewHtml() {
      return '<html><body><div class="slide">A</div></body></html>';
    },
    resolveCurrentStudioDeckReadyActionState() {
      return { canUseDeckActions: true };
    }
  };

  vm.createContext(context);
  vm.runInContext(exportPdfSource, context);

  assert.equal(context.exportPdf(), true);
  assert.deepEqual(JSON.parse(JSON.stringify(calls)), [
    ['resolveStudioPdfPageDimensions', {
      layout: { size: { width: 1280, height: 720, unit: 'px' } }
    }],
    ['openStudioPdfPrintWindow', {
      html: '<html><body><div class="slide">A</div></body></html>',
      pageWidth: '1280px',
      pageHeight: '720px'
    }]
  ]);
});

test('exportPdf skips preview generation when deck actions are unavailable or preview html is empty', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const exportPdfSource = extractFunctionSource(
    fileContent,
    'function exportPdf() {',
    '\n\n    function launchPreview() {'
  );
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

  vm.createContext(context);
  vm.runInContext(exportPdfSource, context);

  assert.equal(context.exportPdf(), false);
  assert.equal(buildCalls, 0);

  context.resolveCurrentStudioDeckReadyActionState = () => ({ canUseDeckActions: true });
  assert.equal(context.exportPdf(), false);
  assert.equal(buildCalls, 1);
});

test('exportPdf reports popup failures and restores the export button', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const exportPdfSource = extractFunctionSource(
    fileContent,
    'function exportPdf() {',
    '\n\n    function launchPreview() {'
  );
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

  vm.createContext(context);
  vm.runInContext(exportPdfSource, context);

  assert.equal(context.exportPdf(), false);
  assert.deepEqual(statusCalls, ['exporting-pdf', 'pdf-export-failed']);
  assert.equal(exportButton.disabled, false);
});
