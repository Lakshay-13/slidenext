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

function loadExportPptx(fileContent, context) {
  const source = extractFunctionSource(
    fileContent,
    'async function exportPptx() {',
    '\n\n    function exportPdf() {'
  );
  vm.createContext(context);
  vm.runInContext(source, context);
}

test('exportPptx posts the canonical deck and downloads the server response', async () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const calls = [];
  const statuses = [];
  const button = { disabled: false };
  const context = {
    currentPresentationUrl: '/presentations/demo/index.html',
    currentTitle: 'Demo deck',
    buildEditorCanonicalDeck() {
      calls.push(['buildEditorCanonicalDeck']);
      return {
        kind: 'slidenext.deck',
        schemaVersion: 1,
        slides: [{ id: 'slide-1', nodes: [] }]
      };
    },
    resolveCurrentStudioDeckReadyActionState() {
      return { canUseDeckActions: true };
    },
    document: {
      getElementById(id) {
        return id === 'exportPptxBtn' ? button : null;
      }
    },
    SlideNextStudioPptxExport: {
      exportStudioPptx(options) {
        calls.push(['exportStudioPptx', options]);
        return Promise.resolve({ success: true, filename: 'Demo_deck.pptx' });
      }
    },
    setStudioAutoSaveStatus(state) {
      statuses.push(state);
    }
  };

  loadExportPptx(fileContent, context);

  assert.equal(await context.exportPptx(), true);
  assert.equal(button.disabled, false);
  assert.deepEqual(statuses, ['exporting', 'exported']);
  const exportCall = calls.find(call => call[0] === 'exportStudioPptx');
  assert.deepEqual(JSON.parse(JSON.stringify(exportCall[1])), {
    canonicalDeck: {
      kind: 'slidenext.deck',
      schemaVersion: 1,
      slides: [{ id: 'slide-1', nodes: [] }]
    },
    sourcePath: '/presentations/demo/index.html',
    filename: 'Demo deck.pptx'
  });
});

test('exportPptx skips unavailable decks and reports failed responses', async () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  let buildCalls = 0;
  let exportCalls = 0;
  const statuses = [];
  const button = { disabled: false };
  const context = {
    currentPresentationUrl: '/presentations/demo/index.html',
    currentTitle: 'Demo deck',
    buildEditorCanonicalDeck() {
      buildCalls += 1;
      return { slides: [{ id: 'slide-1', nodes: [] }] };
    },
    resolveCurrentStudioDeckReadyActionState() {
      return { canUseDeckActions: false };
    },
    document: {
      getElementById() {
        return button;
      }
    },
    SlideNextStudioPptxExport: {
      exportStudioPptx() {
        exportCalls += 1;
        return Promise.resolve({ success: false });
      }
    },
    setStudioAutoSaveStatus(state) {
      statuses.push(state);
    }
  };

  loadExportPptx(fileContent, context);

  assert.equal(await context.exportPptx(), false);
  assert.equal(buildCalls, 0);
  assert.equal(exportCalls, 0);

  context.resolveCurrentStudioDeckReadyActionState = () => ({ canUseDeckActions: true });
  assert.equal(await context.exportPptx(), false);
  assert.equal(exportCalls, 1);
  assert.deepEqual(statuses, ['exporting', 'export-failed']);
  assert.equal(button.disabled, false);

  context.buildEditorCanonicalDeck = () => {
    throw new Error('canonical deck unavailable');
  };
  assert.equal(await context.exportPptx(), false);
  assert.deepEqual(statuses, ['exporting', 'export-failed', 'export-failed']);
});
