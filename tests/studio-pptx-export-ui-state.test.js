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

function loadExportPptx(fileContent, context) {
  const source = extractFunctionSource(
    fileContent,
    'async function exportPptx() {',
    '\n\n    function exportPdf() {'
  );
  context.studioEditorExportController = exportController.createStudioEditorExportController({
    exportActions,
    resolveReadyState: () => context.resolveCurrentStudioDeckReadyActionState(),
    buildCanonicalDeck: () => (
      typeof context.buildEditorCanonicalDeck === 'function'
        ? context.buildEditorCanonicalDeck()
        : null
    ),
    pptxExport: context.SlideNextStudioPptxExport,
    documentRef: context.document,
    setStatus: (...args) => {
      const handler = context.setStudioAutoSaveStatusWithWarningCount || context.setStudioAutoSaveStatus;
      return typeof handler === 'function' ? handler(...args) : undefined;
    },
    resolveSourcePath: () => context.currentPresentationUrl || '',
    resolveFilename: () => (context.currentTitle || 'slidenext-presentation') + '.pptx'
  });
  vm.createContext(context);
  vm.runInContext(source, context);
}

test('deck-view export wiring prefers the live canonical deck resolver', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const runtimeStart = fileContent.indexOf('const studioEditorDeckViewRuntime =');
  const runtimeEnd = fileContent.indexOf('const studioEditorExportController =', runtimeStart);
  assert.notEqual(runtimeStart, -1);
  assert.notEqual(runtimeEnd, -1);
  const runtimeSource = fileContent.slice(runtimeStart, runtimeEnd);
  const callbackStart = runtimeSource.indexOf('buildCanonicalDeck:');
  const callbackEnd = runtimeSource.indexOf('\n          buildMutationCanonicalDeck', callbackStart);
  assert.notEqual(callbackStart, -1);
  assert.notEqual(callbackEnd, -1);
  const callbackExpression = runtimeSource
    .slice(callbackStart + 'buildCanonicalDeck:'.length, callbackEnd)
    .trim()
    .replace(/,$/, '');
  const sourceDoc = { id: 'export-frame' };
  const liveCanonicalDeck = { kind: 'slidenext.deck', slides: [{ id: 'live-slide' }] };
  let receivedDoc = null;
  const buildCanonicalDeck = vm.runInNewContext(`(${callbackExpression})`, {
    resolveEditorUiCanonicalDeck(doc) {
      receivedDoc = doc;
      return liveCanonicalDeck;
    },
    buildEditorCanonicalDeck() {
      throw new Error('export should not rebuild the DOM when live canonical state exists');
    }
  });

  assert.equal(buildCanonicalDeck(sourceDoc), liveCanonicalDeck);
  assert.equal(receivedDoc, sourceDoc);
});

test('deck-view export wiring supplies pending mutation canonical rebuilds', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const runtimeStart = fileContent.indexOf('const studioEditorDeckViewRuntime =');
  const runtimeEnd = fileContent.indexOf('const studioEditorExportController =', runtimeStart);
  assert.notEqual(runtimeStart, -1);
  assert.notEqual(runtimeEnd, -1);
  const runtimeSource = fileContent.slice(runtimeStart, runtimeEnd);
  assert.match(
    runtimeSource,
    /buildMutationCanonicalDeck: typeof buildEditorMutationCanonicalDeck === 'function'/
  );
  assert.match(
    runtimeSource,
    /getPendingTransaction: getStudioPendingEditorTransaction/
  );
});

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
        options.onProgress({ phase: 'response', completed: 1, total: 2, percent: 50 });
        return Promise.resolve({ success: true, filename: 'Demo_deck.pptx', warningCount: 2 });
      }
    },
    setStudioAutoSaveStatus(state, warningCount) {
      statuses.push([state, warningCount]);
    }
  };

  loadExportPptx(fileContent, context);

  assert.equal(await context.exportPptx(), true);
  assert.equal(button.disabled, false);
  assert.deepEqual(statuses, [
    ['exporting', undefined],
    ['exporting', { phase: 'response', completed: 1, total: 2, percent: 50 }],
    ['exported-with-warnings', 2]
  ]);
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

test('exportPptx rejects an empty canonical deck before invoking the browser exporter', async () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const statuses = [];
  let exportCalls = 0;
  const context = {
    currentPresentationUrl: '/presentations/demo/index.html',
    currentTitle: 'Demo deck',
    buildEditorCanonicalDeck() {
      return { kind: 'slidenext.deck', schemaVersion: 1, slides: [] };
    },
    resolveCurrentStudioDeckReadyActionState() {
      return { canUseDeckActions: true };
    },
    document: {
      getElementById() {
        return { disabled: false };
      }
    },
    SlideNextStudioPptxExport: {
      exportStudioPptx() {
        exportCalls += 1;
        return Promise.resolve({ success: true });
      }
    },
    setStudioAutoSaveStatus(state) {
      statuses.push(state);
    }
  };

  loadExportPptx(fileContent, context);

  assert.equal(await context.exportPptx(), false);
  assert.equal(exportCalls, 0);
  assert.deepEqual(statuses, ['export-failed']);
});
