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
    previewHtmlBuilder: { name: 'preview-builder' },
    sourceController: { name: 'source' }
  };
  const callbacks = {
    exportActions: {},
    resolveReadyState() {},
    buildPreviewHtml() {},
    buildCanonicalDeck() {},
    buildMutationCanonicalDeck() {},
    getPendingTransaction() {},
    getCanonicalDeckBaseline() {},
    isCanonicalDeck() {},
    pdfExport: {},
    pptxExport: {},
    documentRef: {},
    resolvePdfBaseHref() {},
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
    previewBuildDeckViewHtml() {},
    previewCreateDeckViewHtmlOptions() {},
    resolveBuildStudioPreviewHtml() {},
    resolveBuildDeckPreviewHtml() {},
    resolveInjectBaseHrefIntoHtml() {},
    resolveBuildPresentationBaseHref() {},
    previewBuildCanonicalDeck() {},
    previewIsCanonicalDeck() {},
    sourceApi: {},
    resolveSourceHtml() {},
    resolveSourceCss() {},
    applySourceCss() {},
    sourceBuildCanonicalDeck() {},
    sourceGetCanonicalDeckBaseline() {},
    getCurrentDocument() {},
    resolveActiveSlideId() {},
    resolveHistoryOptions() {},
    saveHistoryState() {},
    sourceIsCanonicalDeck() {},
    beforeApply() {},
    captureHistoryEntry() {},
    restoreHistoryEntry() {},
    afterApply() {}
  };
  const api = (name, factoryName, result) => ({
    [factoryName](options) {
      calls.push([name, options]);
      return result;
    }
  });
  const previewControllerApi = {
    createStudioEditorPreviewController(options) {
      calls.push(['preview', options]);
      return controllers.previewController;
    },
    createStudioEditorPreviewHtmlBuilder(options) {
      calls.push(['preview-builder', options]);
      return controllers.previewHtmlBuilder;
    }
  };

  const result = deckViewRuntime.createStudioEditorDeckViewRuntime({
    exportApi: api('export', 'createStudioEditorExportController', controllers.exportController),
    snapshotControllerApi: api('snapshot', 'createStudioEditorDeckSnapshotController', controllers.deckSnapshotController),
    previewControllerApi,
    sourceControllerApi: api('source', 'createStudioEditorSourceController', controllers.sourceController),
    ...callbacks
  });

  assert.deepEqual(result, controllers);
  const findCall = (name) => calls.find(([callName]) => callName === name)[1];
  assert.equal(findCall('export').buildCanonicalDeck, callbacks.buildCanonicalDeck);
  assert.equal(findCall('export').buildMutationCanonicalDeck, callbacks.buildMutationCanonicalDeck);
  assert.equal(findCall('export').getPendingTransaction, callbacks.getPendingTransaction);
  assert.equal(findCall('export').resolvePdfBaseHref, callbacks.resolvePdfBaseHref);
  assert.equal(findCall('export').pptxExport, callbacks.pptxExport);
  assert.equal(findCall('snapshot').snapshotApi, callbacks.snapshotApi);
  assert.equal(findCall('snapshot').buildCanonicalDeck, callbacks.buildCanonicalDeck);
  assert.equal(findCall('snapshot').buildElementSnapshot, callbacks.buildElementSnapshot);
  assert.equal(findCall('preview').buildPreviewHtml, callbacks.previewBuildHtml);
  assert.equal(findCall('preview').isCanonicalDeck, callbacks.previewIsCanonicalDeck);
  assert.equal(findCall('preview-builder').buildDeckViewHtml, callbacks.previewBuildDeckViewHtml);
  assert.equal(
    findCall('preview-builder').createDeckViewHtmlOptions,
    callbacks.previewCreateDeckViewHtmlOptions
  );
  assert.equal(
    findCall('preview-builder').resolveBuildPresentationBaseHref,
    callbacks.resolveBuildPresentationBaseHref
  );
  assert.equal(findCall('source').buildCanonicalDeck, callbacks.sourceBuildCanonicalDeck);
  assert.equal(findCall('source').resolveSourceCss, callbacks.resolveSourceCss);
  assert.equal(findCall('source').saveHistoryState, callbacks.saveHistoryState);
  assert.equal(findCall('source').applySourceCss, callbacks.applySourceCss);
  assert.equal(findCall('source').captureHistoryEntry, callbacks.captureHistoryEntry);
  assert.equal(findCall('source').afterApply, callbacks.afterApply);
});

test('index wires deck view composition through the runtime module', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-deck-view-runtime\.js"><\/script>/
  );
  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-deck-view-shell-runtime\.js"><\/script>/
  );
  assert.match(
    fileContent,
    /SlideNextStudioEditorDeckViewShellRuntime\.createStudioEditorDeckViewShellRuntime\(/
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
    /SlideNextStudioEditorPreviewController\.createStudioEditorPreviewHtmlBuilder\(/
  );
  assert.doesNotMatch(
    fileContent,
    /SlideNextStudioEditorSourceController\.createStudioEditorSourceController\(/
  );
});
