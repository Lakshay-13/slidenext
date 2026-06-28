const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const canonicalDeckModel = require('../shared/canonical-deck.js');
const editorPersistence = require('../shared/studio-editor-persistence.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

function extractFunctionSource(fileContent, startMarker, endMarker) {
  const start = fileContent.indexOf(startMarker);
  assert.notEqual(start, -1, `Missing start marker: ${startMarker}`);
  const end = fileContent.indexOf(endMarker, start);
  assert.notEqual(end, -1, `Missing end marker: ${endMarker}`);
  return fileContent.slice(start, end);
}

test('buildEditorSaveRequestBody includes a canonical deck sidecar for save requests', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const buildEditorSaveRequestBodySource = extractFunctionSource(
    fileContent,
    'function buildEditorSaveRequestBody(doc = getIframeDoc(), cleanHtml = null, options = {}) {',
    '\n\n    function isCurrentDeckHtmlPersisted(cleanHtml) {'
  );

  const doc = { label: 'iframe-doc' };
  const canonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: []
  };
  const context = {
    SlideNextStudioEditorPersistence: editorPersistence,
    SlideNextCanonicalDeck: {
      isCanonicalDeck(deck) {
        return !!deck && deck.kind === 'slidenext.deck' && Array.isArray(deck.slides);
      }
    },
    currentPresentationUrl: 'presentations/onboarding-presentation/index.html',
    buildPersistableDeckHtml(nextDoc) {
      assert.equal(nextDoc, doc);
      return '<html>persisted</html>';
    },
    buildEditorCanonicalDeck(nextDoc) {
      assert.equal(nextDoc, doc);
      return canonicalDeck;
    },
    getIframeDoc() {
      return doc;
    }
  };

  vm.createContext(context);
  vm.runInContext(buildEditorSaveRequestBodySource, context);

  assert.deepEqual(
    context.buildEditorSaveRequestBody(doc, '<html>persisted</html>', {
      presentationUrl: 'presentations/onboarding-presentation/index.html',
      isAutoSave: true,
      versionLabel: 'Auto: Updated Deck'
    }),
    {
      htmlPath: 'presentations/onboarding-presentation/index.html',
      htmlContent: '<html>persisted</html>',
      isAutoSave: true,
      versionLabel: 'Auto: Updated Deck',
      canonicalDeck: canonicalDeckModel.createCanonicalDeck(canonicalDeck)
    }
  );
});

test('buildEditorSaveRequestBody falls back to the persisted html baseline when the editor frame is unavailable', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const buildEditorSaveRequestBodySource = extractFunctionSource(
    fileContent,
    'function buildEditorSaveRequestBody(doc = getIframeDoc(), cleanHtml = null, options = {}) {',
    '\n\n    function isCurrentDeckHtmlPersisted(cleanHtml) {'
  );

  const canonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: []
  };
  let buildPersistableDeckHtmlCalls = 0;
  const context = {
    SlideNextStudioEditorPersistence: editorPersistence,
    SlideNextCanonicalDeck: {
      isCanonicalDeck(deck) {
        return !!deck && deck.kind === 'slidenext.deck' && Array.isArray(deck.slides);
      }
    },
    buildPersistableDeckHtml(nextDoc) {
      buildPersistableDeckHtmlCalls += 1;
      assert.equal(nextDoc, null);
      return '<html>persisted-baseline</html>';
    },
    buildEditorCanonicalDeck(nextDoc) {
      assert.equal(nextDoc, null);
      return canonicalDeck;
    },
    currentPresentationUrl: 'presentations/onboarding-presentation/index.html',
    getIframeDoc() {
      return null;
    },
    lastPersistedDeckHtml: '<html>persisted-baseline</html>'
  };

  vm.createContext(context);
  vm.runInContext(buildEditorSaveRequestBodySource, context);

  assert.deepEqual(
    context.buildEditorSaveRequestBody(),
    {
      htmlPath: 'presentations/onboarding-presentation/index.html',
      htmlContent: '<html>persisted-baseline</html>',
      isAutoSave: false,
      canonicalDeck: canonicalDeckModel.createCanonicalDeck(canonicalDeck)
    }
  );
  assert.equal(buildPersistableDeckHtmlCalls, 1);
});

test('buildPersistableDeckHtml falls back to the persisted html baseline when the editor frame is unavailable', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const resolveEditorFallbackActiveSlideIdSource = extractFunctionSource(
    fileContent,
    'function resolveEditorFallbackActiveSlideId(doc = getIframeDoc(), canonicalDeck = null) {',
    '\n\n    function buildEditorPreviewHtml(doc = getIframeDoc()) {'
  );
  const buildPersistableDeckHtmlSource = extractFunctionSource(
    fileContent,
    'function buildPersistableDeckHtml(doc = getIframeDoc()) {',
    '\n\n    function capturePersistedDeckPlaybackState(doc = getIframeDoc()) {'
  );

  let sharedBuildCalls = 0;
  let buildEditorCanonicalDeckCalls = 0;
  const canonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: []
  };
  const context = {
    EDITOR_CHROME_NODE_IDS: ['editorSelectionOverlay'],
    EDITOR_ELEMENT_ID_ATTR: 'data-editor-id',
    EDITOR_SLIDE_ID_ATTR: 'data-slide-id',
    SlideNextDeckPersistence: {
      buildPersistableDeckHtml() {
        sharedBuildCalls += 1;
        return '<html>rebuilt</html>';
      }
    },
    SlideNextStudioEditorPersistence: {
      isStudioPersistedCanonicalDeck(nextCanonicalDeck, persistedCanonicalDeck) {
        assert.equal(nextCanonicalDeck, canonicalDeck);
        assert.equal(persistedCanonicalDeck, canonicalDeck);
        return true;
      }
    },
    buildEditorCanonicalDeck(nextDoc) {
      buildEditorCanonicalDeckCalls += 1;
      assert.equal(nextDoc, null);
      return canonicalDeck;
    },
    getIframeDoc() {
      return null;
    },
    lastPersistedDeckHtml: '<html>persisted-baseline</html>',
    lastPersistedCanonicalDeck: canonicalDeck,
    persistedDeckPlaybackState: null
  };

  vm.createContext(context);
  vm.runInContext(resolveEditorFallbackActiveSlideIdSource, context);
  vm.runInContext(buildPersistableDeckHtmlSource, context);

  assert.equal(context.buildPersistableDeckHtml(), '<html>persisted-baseline</html>');
  assert.equal(sharedBuildCalls, 0);
  assert.equal(buildEditorCanonicalDeckCalls, 1);
});

test('buildPersistableDeckHtml captures the live playback state before persisting iframe html', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const buildPersistableDeckHtmlSource = extractFunctionSource(
    fileContent,
    'function buildPersistableDeckHtml(doc = getIframeDoc()) {',
    '\n\n    function capturePersistedDeckPlaybackState(doc = getIframeDoc()) {'
  );

  const iframeDoc = { label: 'iframe-doc' };
  const livePlaybackState = {
    activeSlideIds: ['slide-live'],
    slideCounterText: '2 / 5'
  };
  const calls = [];
  const context = {
    EDITOR_CHROME_NODE_IDS: ['editorSelectionOverlay'],
    EDITOR_ELEMENT_ID_ATTR: 'data-editor-id',
    EDITOR_SLIDE_ID_ATTR: 'data-slide-id',
    SlideNextDeckPersistence: {
      buildPersistableDeckHtml(nextDoc, options) {
        calls.push(['buildPersistableDeckHtml', nextDoc, options]);
        return '<html>persisted-live</html>';
      }
    },
    capturePersistedDeckPlaybackState(nextDoc) {
      calls.push(['capturePersistedDeckPlaybackState', nextDoc]);
      assert.equal(nextDoc, iframeDoc);
      return livePlaybackState;
    },
    getIframeDoc() {
      return iframeDoc;
    },
    persistedDeckPlaybackState: {
      activeSlideIds: ['slide-stale'],
      slideCounterText: '1 / 5'
    }
  };

  vm.createContext(context);
  vm.runInContext(buildPersistableDeckHtmlSource, context);

  assert.equal(context.buildPersistableDeckHtml(), '<html>persisted-live</html>');
  assert.deepEqual(calls.map(([name]) => name), [
    'capturePersistedDeckPlaybackState',
    'buildPersistableDeckHtml'
  ]);
  assert.equal(calls[1][1], iframeDoc);
  assert.equal(calls[1][2].persistedDeckPlaybackState, livePlaybackState);
});

test('buildPersistableDeckHtml renders canonical deck html when the editor frame and persisted baseline are unavailable', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const resolveEditorFallbackActiveSlideIdSource = extractFunctionSource(
    fileContent,
    'function resolveEditorFallbackActiveSlideId(doc = getIframeDoc(), canonicalDeck = null) {',
    '\n\n    function buildEditorPreviewHtml(doc = getIframeDoc()) {'
  );
  const buildPersistableDeckHtmlSource = extractFunctionSource(
    fileContent,
    'function buildPersistableDeckHtml(doc = getIframeDoc()) {',
    '\n\n    function capturePersistedDeckPlaybackState(doc = getIframeDoc()) {'
  );

  const canonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: [
      {
        id: 'slide-1',
        nodes: []
      }
    ]
  };
  let sharedBuildCalls = 0;
  const calls = [];
  const context = {
    EDITOR_CHROME_NODE_IDS: ['editorSelectionOverlay'],
    EDITOR_ELEMENT_ID_ATTR: 'data-editor-id',
    EDITOR_SLIDE_ID_ATTR: 'data-slide-id',
    SlideNextDeckPersistence: {
      buildPersistableDeckHtml() {
        sharedBuildCalls += 1;
        return '<html>rebuilt</html>';
      }
    },
    SlideNextStudioEditorPersistence: {
      isStudioPersistedCanonicalDeck() {
        throw new Error('persisted canonical deck comparison should not run without a persisted html baseline');
      }
    },
    SlideNextStudioDeckView: {
      buildStudioSourceHtml(nextDoc, options) {
        calls.push([nextDoc, options]);
        return '<html>canonical-source</html>';
      }
    },
    buildEditorCanonicalDeck(nextDoc) {
      assert.equal(nextDoc, null);
      return canonicalDeck;
    },
    currentSlideIndex: 0,
    getPersistedActiveSlideId() {
      return 'slide-2';
    },
    getIframeDoc() {
      return null;
    },
    lastPersistedDeckHtml: '',
    persistedDeckPlaybackState: {
      activeSlideIds: ['slide-2']
    }
  };

  vm.createContext(context);
  vm.runInContext(resolveEditorFallbackActiveSlideIdSource, context);
  vm.runInContext(buildPersistableDeckHtmlSource, context);

  assert.equal(context.buildPersistableDeckHtml(), '<html>canonical-source</html>');
  assert.equal(sharedBuildCalls, 0);
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], null);
  assert.equal(typeof calls[0][1].buildCanonicalDeck, 'function');
  assert.equal(calls[0][1].buildCanonicalDeck(null), canonicalDeck);
  assert.equal(calls[0][1].buildFallbackHtml(), '');
  assert.equal(calls[0][1].deckHtmlOptions.renderOptions.activeSlideId, 'slide-1');
  assert.equal(calls[0][1].deckHtmlOptions.renderOptions.preferSourceHtml, false);
  assert.equal(calls[0][1].deckHtmlOptions.renderOptions.preferBodySourceHtml, false);
  assert.equal(calls[0][1].deckHtmlOptions.renderOptions.preferSlideSourceHtml, false);
});

test('buildPersistableDeckHtml prefers rendered canonical html when the current canonical deck differs from the persisted baseline', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const resolveEditorFallbackActiveSlideIdSource = extractFunctionSource(
    fileContent,
    'function resolveEditorFallbackActiveSlideId(doc = getIframeDoc(), canonicalDeck = null) {',
    '\n\n    function buildEditorPreviewHtml(doc = getIframeDoc()) {'
  );
  const buildPersistableDeckHtmlSource = extractFunctionSource(
    fileContent,
    'function buildPersistableDeckHtml(doc = getIframeDoc()) {',
    '\n\n    function capturePersistedDeckPlaybackState(doc = getIframeDoc()) {'
  );

  const persistedCanonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: [{ id: 'slide-persisted', nodes: [] }]
  };
  const currentCanonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: [
      { id: 'slide-current', nodes: [] },
      { id: 'slide-next', nodes: [] }
    ]
  };
  let sharedBuildCalls = 0;
  const calls = [];
  const context = {
    EDITOR_CHROME_NODE_IDS: ['editorSelectionOverlay'],
    EDITOR_ELEMENT_ID_ATTR: 'data-editor-id',
    EDITOR_SLIDE_ID_ATTR: 'data-slide-id',
    SlideNextDeckPersistence: {
      buildPersistableDeckHtml() {
        sharedBuildCalls += 1;
        return '<html>rebuilt</html>';
      }
    },
    SlideNextStudioEditorPersistence: {
      isStudioPersistedCanonicalDeck(nextCanonicalDeck, nextPersistedCanonicalDeck) {
        assert.equal(nextCanonicalDeck, currentCanonicalDeck);
        assert.equal(nextPersistedCanonicalDeck, persistedCanonicalDeck);
        return false;
      }
    },
    SlideNextStudioDeckView: {
      buildStudioSourceHtml(nextDoc, options) {
        calls.push([nextDoc, options]);
        return '<html>canonical-source</html>';
      }
    },
    buildEditorCanonicalDeck(nextDoc) {
      assert.equal(nextDoc, null);
      return currentCanonicalDeck;
    },
    currentSlideIndex: 1,
    getPersistedActiveSlideId() {
      return 'slide-current';
    },
    getIframeDoc() {
      return null;
    },
    lastPersistedDeckHtml: '<html>persisted-baseline</html>',
    lastPersistedCanonicalDeck: persistedCanonicalDeck,
    persistedDeckPlaybackState: {
      activeSlideIds: ['slide-current']
    }
  };

  vm.createContext(context);
  vm.runInContext(resolveEditorFallbackActiveSlideIdSource, context);
  vm.runInContext(buildPersistableDeckHtmlSource, context);

  assert.equal(context.buildPersistableDeckHtml(), '<html>canonical-source</html>');
  assert.equal(sharedBuildCalls, 0);
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], null);
  assert.equal(calls[0][1].buildCanonicalDeck(), currentCanonicalDeck);
  assert.equal(calls[0][1].buildFallbackHtml(), '<html>persisted-baseline</html>');
  assert.equal(calls[0][1].deckHtmlOptions.renderOptions.activeSlideId, 'slide-next');
  assert.equal(calls[0][1].deckHtmlOptions.renderOptions.preferSourceHtml, false);
  assert.equal(calls[0][1].deckHtmlOptions.renderOptions.preferBodySourceHtml, false);
  assert.equal(calls[0][1].deckHtmlOptions.renderOptions.preferSlideSourceHtml, false);
});
