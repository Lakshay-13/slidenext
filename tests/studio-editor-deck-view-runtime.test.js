const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const deckViewRuntime = require('../shared/studio-editor-deck-view-runtime.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

test('deck view runtime composes export, snapshot, preview, and source controllers', () => {
  const calls = [];
  const controllers = {
    exportController: { name: 'export' },
    deckSnapshotController: { name: 'snapshot' },
    previewController: { name: 'preview' },
    sourceController: { name: 'source' }
  };
  const callbacks = {
    exportActions: {},
    resolveReadyState() {},
    buildPreviewHtml() {},
    buildCanonicalDeck() {},
    getCanonicalDeckBaseline() {},
    isCanonicalDeck() {},
    pdfExport: {},
    pptxExport: {},
    documentRef: {},
    setStatus() {},
    resolveSourcePath() {},
    resolveFilename() {},
    snapshotApi: {},
    getDocument() {},
    createDeckViewStateOptions() {},
    resolveCanonicalDeckViewState() {},
    resolveFallbackActiveSlideId() {},
    resolveLiveActiveSlide() {},
    getActiveSlideId() {},
    getSlideById() {},
    buildSlideLayerSnapshot() {},
    getSlides() {},
    getActiveSlide() {},
    getSlideId() {},
    getSlideEditableElements() {},
    getNormalizedSlideLayerOrder() {},
    buildElementSnapshot() {},
    previewApi: {},
    resolvePresentationUrl() {},
    resolveActiveSlideIndex() {},
    previewBuildHtml() {},
    previewBuildCanonicalDeck() {},
    previewIsCanonicalDeck() {},
    sourceApi: {},
    resolveSourceHtml() {},
    sourceBuildCanonicalDeck() {},
    sourceGetCanonicalDeckBaseline() {},
    getCurrentDocument() {},
    resolveActiveSlideId() {},
    resolveHistoryOptions() {},
    sourceIsCanonicalDeck() {},
    beforeApply() {},
    restoreHistoryEntry() {},
    afterApply() {}
  };
  const api = (name, factoryName, result) => ({
    [factoryName](options) {
      calls.push([name, options]);
      return result;
    }
  });

  const result = deckViewRuntime.createStudioEditorDeckViewRuntime({
    exportApi: api('export', 'createStudioEditorExportController', controllers.exportController),
    snapshotControllerApi: api('snapshot', 'createStudioEditorDeckSnapshotController', controllers.deckSnapshotController),
    previewControllerApi: api('preview', 'createStudioEditorPreviewController', controllers.previewController),
    sourceControllerApi: api('source', 'createStudioEditorSourceController', controllers.sourceController),
    ...callbacks
  });

  assert.deepEqual(result, controllers);
  assert.equal(calls[0][1].buildCanonicalDeck, callbacks.buildCanonicalDeck);
  assert.equal(calls[0][1].pptxExport, callbacks.pptxExport);
  assert.equal(calls[1][1].snapshotApi, callbacks.snapshotApi);
  assert.equal(calls[1][1].buildElementSnapshot, callbacks.buildElementSnapshot);
  assert.equal(calls[2][1].buildPreviewHtml, callbacks.previewBuildHtml);
  assert.equal(calls[2][1].isCanonicalDeck, callbacks.previewIsCanonicalDeck);
  assert.equal(calls[3][1].buildCanonicalDeck, callbacks.sourceBuildCanonicalDeck);
  assert.equal(calls[3][1].afterApply, callbacks.afterApply);
});

test('index wires deck view composition through the runtime module', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-deck-view-runtime\.js"><\/script>/
  );
  assert.match(
    fileContent,
    /SlideNextStudioEditorDeckViewRuntime\.createStudioEditorDeckViewRuntime\(/
  );
  assert.doesNotMatch(
    fileContent,
    /SlideNextStudioEditorExportController\.createStudioEditorExportController\(/
  );
  assert.doesNotMatch(
    fileContent,
    /SlideNextStudioEditorPreviewController\.createStudioEditorPreviewController\(/
  );
  assert.doesNotMatch(
    fileContent,
    /SlideNextStudioEditorSourceController\.createStudioEditorSourceController\(/
  );
});
