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

function loadGetCurrentEditorPersistedDeckState(fileContent, context) {
  const helperSource = extractFunctionSource(
    fileContent,
    'function getCurrentEditorPersistedDeckState() {',
    '\n\n    function buildEditorDeckSnapshot(doc = getIframeDoc(), options = {}) {'
  );
  vm.runInContext(helperSource, context);
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
  let buildEditorCanonicalDeckCalls = 0;
  const context = {
    SlideNextStudioEditorPersistence: editorPersistence,
    SlideNextCanonicalDeck: {
      isCanonicalDeck(deck) {
        return !!deck && deck.kind === 'slidenext.deck' && Array.isArray(deck.slides);
      }
    },
    buildPersistableDeckHtml(nextDoc, buildOptions) {
      buildPersistableDeckHtmlCalls += 1;
      assert.equal(nextDoc, null);
      assert.equal(buildOptions.canonicalDeck, canonicalDeck);
      return '<html>persisted-baseline</html>';
    },
    buildEditorCanonicalDeck(nextDoc) {
      buildEditorCanonicalDeckCalls += 1;
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
  assert.equal(buildEditorCanonicalDeckCalls, 1);
});

test('buildEditorSaveRequestBody reuses a provided canonical deck override', () => {
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
  let buildEditorCanonicalDeckCalls = 0;
  const context = {
    SlideNextStudioEditorPersistence: editorPersistence,
    SlideNextCanonicalDeck: {
      isCanonicalDeck(deck) {
        return !!deck && deck.kind === 'slidenext.deck' && Array.isArray(deck.slides);
      }
    },
    buildPersistableDeckHtml(nextDoc, buildOptions) {
      assert.equal(nextDoc, null);
      assert.equal(buildOptions.canonicalDeck, canonicalDeck);
      return '<html>persisted-baseline</html>';
    },
    buildEditorCanonicalDeck() {
      buildEditorCanonicalDeckCalls += 1;
      return canonicalDeck;
    },
    currentPresentationUrl: 'presentations/onboarding-presentation/index.html',
    getIframeDoc() {
      return null;
    }
  };

  vm.createContext(context);
  vm.runInContext(buildEditorSaveRequestBodySource, context);

  assert.deepEqual(
    context.buildEditorSaveRequestBody(null, null, {
      canonicalDeck
    }),
    {
      htmlPath: 'presentations/onboarding-presentation/index.html',
      htmlContent: '<html>persisted-baseline</html>',
      isAutoSave: false,
      canonicalDeck: canonicalDeckModel.createCanonicalDeck(canonicalDeck)
    }
  );
  assert.equal(buildEditorCanonicalDeckCalls, 0);
});

test('buildEditorSaveRequestBody falls back to the editor canonical deck when a provided override is malformed', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const buildEditorSaveRequestBodySource = extractFunctionSource(
    fileContent,
    'function buildEditorSaveRequestBody(doc = getIframeDoc(), cleanHtml = null, options = {}) {',
    '\n\n    function isCurrentDeckHtmlPersisted(cleanHtml) {'
  );

  const fallbackCanonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: []
  };
  const malformedCanonicalDeck = {
    slides: 'not-an-array'
  };
  let buildEditorCanonicalDeckCalls = 0;
  const context = {
    SlideNextStudioEditorPersistence: editorPersistence,
    SlideNextCanonicalDeck: {
      isCanonicalDeck(deck) {
        return !!deck && deck.kind === 'slidenext.deck' && Array.isArray(deck.slides);
      }
    },
    buildPersistableDeckHtml(nextDoc, buildOptions) {
      assert.equal(nextDoc, null);
      assert.equal(buildOptions.canonicalDeck, fallbackCanonicalDeck);
      return '<html>persisted-baseline</html>';
    },
    buildEditorCanonicalDeck() {
      buildEditorCanonicalDeckCalls += 1;
      return fallbackCanonicalDeck;
    },
    currentPresentationUrl: 'presentations/onboarding-presentation/index.html',
    getIframeDoc() {
      return null;
    }
  };

  vm.createContext(context);
  vm.runInContext(buildEditorSaveRequestBodySource, context);

  assert.deepEqual(
    context.buildEditorSaveRequestBody(null, null, {
      canonicalDeck: malformedCanonicalDeck
    }),
    {
      htmlPath: 'presentations/onboarding-presentation/index.html',
      htmlContent: '<html>persisted-baseline</html>',
      isAutoSave: false,
      canonicalDeck: canonicalDeckModel.createCanonicalDeck(fallbackCanonicalDeck)
    }
  );
  assert.equal(buildEditorCanonicalDeckCalls, 1);
});

test('buildEditorSaveRequestBody reuses the captured persistable deck state when clean html is not supplied', () => {
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
  const calls = [];
  const context = {
    SlideNextStudioEditorPersistence: editorPersistence,
    captureEditorPersistableDeckState(nextDoc, captureOptions = {}) {
      calls.push(['captureEditorPersistableDeckState', nextDoc, captureOptions]);
      assert.equal(nextDoc, doc);
      assert.equal(captureOptions.canonicalDeck, null);
      return {
        cleanHtml: '<html>captured</html>',
        canonicalDeck
      };
    },
    buildPersistableDeckHtml() {
      throw new Error('buildPersistableDeckHtml should not run when captureEditorPersistableDeckState provides html');
    },
    buildEditorCanonicalDeck() {
      throw new Error('buildEditorCanonicalDeck should not run when captureEditorPersistableDeckState provides a canonical deck');
    },
    currentPresentationUrl: 'presentations/onboarding-presentation/index.html',
    getIframeDoc() {
      return doc;
    }
  };

  vm.createContext(context);
  vm.runInContext(buildEditorSaveRequestBodySource, context);

  assert.deepEqual(
    context.buildEditorSaveRequestBody(),
    {
      htmlPath: 'presentations/onboarding-presentation/index.html',
      htmlContent: '<html>captured</html>',
      isAutoSave: false,
      canonicalDeck: canonicalDeckModel.createCanonicalDeck(canonicalDeck)
    }
  );
  assert.deepEqual(calls.map(([name]) => name), ['captureEditorPersistableDeckState']);
});

test('buildEditorSaveRequestBody reuses the local save canonical deck helper when capture state omits a canonical deck', () => {
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
  const calls = [];
  const context = {
    SlideNextStudioEditorPersistence: editorPersistence,
    createEditorSaveCanonicalDeckResolver(nextDoc) {
      calls.push(['createEditorSaveCanonicalDeckResolver', nextDoc]);
      assert.equal(nextDoc, doc);
      return (nextCanonicalDeck) => {
        calls.push(['resolveSaveCanonicalDeck', nextCanonicalDeck]);
        assert.equal(nextCanonicalDeck, null);
        return canonicalDeck;
      };
    },
    captureEditorPersistableDeckState(nextDoc, captureOptions = {}) {
      calls.push(['captureEditorPersistableDeckState', nextDoc, captureOptions]);
      assert.equal(nextDoc, doc);
      assert.equal(captureOptions.canonicalDeck, null);
      return {
        cleanHtml: '<html>captured</html>'
      };
    },
    buildPersistableDeckHtml() {
      throw new Error('buildPersistableDeckHtml should not run when captureEditorPersistableDeckState provides html');
    },
    buildEditorCanonicalDeck() {
      throw new Error('buildEditorCanonicalDeck should not run when createEditorSaveCanonicalDeckResolver is available');
    },
    currentPresentationUrl: 'presentations/onboarding-presentation/index.html',
    getIframeDoc() {
      return doc;
    }
  };

  vm.createContext(context);
  vm.runInContext(buildEditorSaveRequestBodySource, context);

  assert.deepEqual(
    context.buildEditorSaveRequestBody(),
    {
      htmlPath: 'presentations/onboarding-presentation/index.html',
      htmlContent: '<html>captured</html>',
      isAutoSave: false,
      canonicalDeck: canonicalDeckModel.createCanonicalDeck(canonicalDeck)
    }
  );
  assert.deepEqual(calls.map(([name]) => name), [
    'createEditorSaveCanonicalDeckResolver',
    'captureEditorPersistableDeckState',
    'resolveSaveCanonicalDeck'
  ]);
});

test('buildPersistableDeckHtml falls back to the persisted html baseline when the editor frame is unavailable', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const resolveEditorFallbackActiveSlideIdSource = extractFunctionSource(
    fileContent,
    'function resolveEditorFallbackActiveSlideId(doc = getIframeDoc(), canonicalDeck = null) {',
    '\n\n    function buildEditorPreviewHtml(doc = getIframeDoc()) {'
  );
  const getEditorDeckSanitizerOptionsSource = extractFunctionSource(
    fileContent,
    'function getEditorDeckSanitizerOptions(options = {}) {',
    '\n\n    function getEditorHistoryOptions(options = {}) {'
  );
  const buildPersistableDeckHtmlSource = extractFunctionSource(
    fileContent,
    'function buildPersistableDeckHtml(doc = getIframeDoc()) {',
    '\n\n    function capturePersistedDeckPlaybackState(doc = getIframeDoc(), canonicalDeck = null) {'
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
      ...editorPersistence,
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
  loadGetCurrentEditorPersistedDeckState(fileContent, context);
  vm.runInContext(resolveEditorFallbackActiveSlideIdSource, context);
  vm.runInContext(getEditorDeckSanitizerOptionsSource, context);
  vm.runInContext(buildPersistableDeckHtmlSource, context);

  assert.equal(context.buildPersistableDeckHtml(), '<html>persisted-baseline</html>');
  assert.equal(sharedBuildCalls, 0);
  assert.equal(buildEditorCanonicalDeckCalls, 1);
});

test('buildPersistableDeckHtml reuses a provided canonical deck when the editor frame is unavailable', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const resolveEditorFallbackActiveSlideIdSource = extractFunctionSource(
    fileContent,
    'function resolveEditorFallbackActiveSlideId(doc = getIframeDoc(), canonicalDeck = null) {',
    '\n\n    function buildEditorPreviewHtml(doc = getIframeDoc()) {'
  );
  const getEditorDeckSanitizerOptionsSource = extractFunctionSource(
    fileContent,
    'function getEditorDeckSanitizerOptions(options = {}) {',
    '\n\n    function getEditorHistoryOptions(options = {}) {'
  );
  const buildPersistableDeckHtmlSource = extractFunctionSource(
    fileContent,
    'function buildPersistableDeckHtml(doc = getIframeDoc()) {',
    '\n\n    function capturePersistedDeckPlaybackState(doc = getIframeDoc(), canonicalDeck = null) {'
  );

  let buildEditorCanonicalDeckCalls = 0;
  const canonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: []
  };
  const calls = [];
  const context = {
    EDITOR_CHROME_NODE_IDS: ['editorSelectionOverlay'],
    EDITOR_ELEMENT_ID_ATTR: 'data-editor-id',
    EDITOR_SLIDE_ID_ATTR: 'data-slide-id',
    createEditorPersistableCanonicalDeckOverrideResolver(nextDoc, nextCanonicalDeck) {
      calls.push(['createEditorPersistableCanonicalDeckOverrideResolver', nextDoc, nextCanonicalDeck]);
      assert.equal(nextDoc, null);
      assert.equal(nextCanonicalDeck, canonicalDeck);
      return (shouldBuildFallbackCanonicalDeck = false) => {
        calls.push(['resolveCanonicalDeckOverride', shouldBuildFallbackCanonicalDeck]);
        return canonicalDeck;
      };
    },
    SlideNextDeckPersistence: {
      buildPersistableDeckHtml() {
        throw new Error('shared persistence builder should not run when the editor frame is unavailable');
      }
    },
    SlideNextStudioEditorPersistence: {
      ...editorPersistence,
      isStudioPersistedCanonicalDeck(nextCanonicalDeck, persistedCanonicalDeck) {
        assert.equal(nextCanonicalDeck, canonicalDeck);
        assert.equal(persistedCanonicalDeck, canonicalDeck);
        return true;
      }
    },
    buildEditorCanonicalDeck() {
      buildEditorCanonicalDeckCalls += 1;
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
  loadGetCurrentEditorPersistedDeckState(fileContent, context);
  vm.runInContext(resolveEditorFallbackActiveSlideIdSource, context);
  vm.runInContext(getEditorDeckSanitizerOptionsSource, context);
  vm.runInContext(buildPersistableDeckHtmlSource, context);

  assert.equal(
    context.buildPersistableDeckHtml(null, {
      canonicalDeck
    }),
    '<html>persisted-baseline</html>'
  );
  assert.equal(buildEditorCanonicalDeckCalls, 0);
  assert.deepEqual(calls, [
    ['createEditorPersistableCanonicalDeckOverrideResolver', null, canonicalDeck],
    ['resolveCanonicalDeckOverride', true]
  ]);
});

test('buildPersistableDeckHtml falls back to the editor canonical deck when a provided override is malformed', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const resolveEditorFallbackActiveSlideIdSource = extractFunctionSource(
    fileContent,
    'function resolveEditorFallbackActiveSlideId(doc = getIframeDoc(), canonicalDeck = null) {',
    '\n\n    function buildEditorPreviewHtml(doc = getIframeDoc()) {'
  );
  const getEditorDeckSanitizerOptionsSource = extractFunctionSource(
    fileContent,
    'function getEditorDeckSanitizerOptions(options = {}) {',
    '\n\n    function getEditorHistoryOptions(options = {}) {'
  );
  const buildPersistableDeckHtmlSource = extractFunctionSource(
    fileContent,
    'function buildPersistableDeckHtml(doc = getIframeDoc()) {',
    '\n\n    function capturePersistedDeckPlaybackState(doc = getIframeDoc(), canonicalDeck = null) {'
  );

  let buildEditorCanonicalDeckCalls = 0;
  const canonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: []
  };
  const malformedCanonicalDeck = {
    slides: 'not-an-array'
  };
  const context = {
    EDITOR_CHROME_NODE_IDS: ['editorSelectionOverlay'],
    EDITOR_ELEMENT_ID_ATTR: 'data-editor-id',
    EDITOR_SLIDE_ID_ATTR: 'data-slide-id',
    SlideNextCanonicalDeck: {
      isCanonicalDeck(deck) {
        return !!deck && deck.kind === 'slidenext.deck' && Array.isArray(deck.slides);
      }
    },
    SlideNextDeckPersistence: {
      buildPersistableDeckHtml() {
        throw new Error('shared persistence builder should not run when the editor frame is unavailable');
      }
    },
    SlideNextStudioEditorPersistence: {
      ...editorPersistence,
      isStudioPersistedCanonicalDeck(nextCanonicalDeck, persistedCanonicalDeck) {
        assert.equal(nextCanonicalDeck, canonicalDeck);
        assert.equal(persistedCanonicalDeck, canonicalDeck);
        return true;
      }
    },
    buildEditorCanonicalDeck() {
      buildEditorCanonicalDeckCalls += 1;
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
  loadGetCurrentEditorPersistedDeckState(fileContent, context);
  vm.runInContext(resolveEditorFallbackActiveSlideIdSource, context);
  vm.runInContext(getEditorDeckSanitizerOptionsSource, context);
  vm.runInContext(buildPersistableDeckHtmlSource, context);

  assert.equal(
    context.buildPersistableDeckHtml(null, {
      canonicalDeck: malformedCanonicalDeck
    }),
    '<html>persisted-baseline</html>'
  );
  assert.equal(buildEditorCanonicalDeckCalls, 1);
});

test('buildPersistableDeckHtml reports the resolved canonical deck when the editor frame is unavailable', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const resolveEditorFallbackActiveSlideIdSource = extractFunctionSource(
    fileContent,
    'function resolveEditorFallbackActiveSlideId(doc = getIframeDoc(), canonicalDeck = null) {',
    '\n\n    function buildEditorPreviewHtml(doc = getIframeDoc()) {'
  );
  const getEditorDeckSanitizerOptionsSource = extractFunctionSource(
    fileContent,
    'function getEditorDeckSanitizerOptions(options = {}) {',
    '\n\n    function getEditorHistoryOptions(options = {}) {'
  );
  const buildPersistableDeckHtmlSource = extractFunctionSource(
    fileContent,
    'function buildPersistableDeckHtml(doc = getIframeDoc()) {',
    '\n\n    function capturePersistedDeckPlaybackState(doc = getIframeDoc(), canonicalDeck = null) {'
  );

  const canonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: []
  };
  let reportedCanonicalDeck = null;
  const context = {
    EDITOR_CHROME_NODE_IDS: ['editorSelectionOverlay'],
    EDITOR_ELEMENT_ID_ATTR: 'data-editor-id',
    EDITOR_SLIDE_ID_ATTR: 'data-slide-id',
    SlideNextDeckPersistence: {
      buildPersistableDeckHtml() {
        throw new Error('shared persistence builder should not run when the editor frame is unavailable');
      }
    },
    SlideNextStudioEditorPersistence: {
      ...editorPersistence,
      isStudioPersistedCanonicalDeck(nextCanonicalDeck, persistedCanonicalDeck) {
        assert.equal(nextCanonicalDeck, canonicalDeck);
        assert.equal(persistedCanonicalDeck, canonicalDeck);
        return true;
      }
    },
    buildEditorCanonicalDeck() {
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
  loadGetCurrentEditorPersistedDeckState(fileContent, context);
  vm.runInContext(resolveEditorFallbackActiveSlideIdSource, context);
  vm.runInContext(getEditorDeckSanitizerOptionsSource, context);
  vm.runInContext(buildPersistableDeckHtmlSource, context);

  assert.equal(
    context.buildPersistableDeckHtml(null, {
      onCanonicalDeckResolved(deck) {
        reportedCanonicalDeck = deck;
      }
    }),
    '<html>persisted-baseline</html>'
  );
  assert.equal(reportedCanonicalDeck, canonicalDeck);
});

test('buildPersistableDeckHtml delegates persisted html reuse checks to the shared editor persistence helper when available', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const resolveEditorFallbackActiveSlideIdSource = extractFunctionSource(
    fileContent,
    'function resolveEditorFallbackActiveSlideId(doc = getIframeDoc(), canonicalDeck = null) {',
    '\n\n    function buildEditorPreviewHtml(doc = getIframeDoc()) {'
  );
  const getEditorDeckSanitizerOptionsSource = extractFunctionSource(
    fileContent,
    'function getEditorDeckSanitizerOptions(options = {}) {',
    '\n\n    function getEditorHistoryOptions(options = {}) {'
  );
  const buildPersistableDeckHtmlSource = extractFunctionSource(
    fileContent,
    'function buildPersistableDeckHtml(doc = getIframeDoc()) {',
    '\n\n    function capturePersistedDeckPlaybackState(doc = getIframeDoc(), canonicalDeck = null) {'
  );

  let delegatedArgs = null;
  let sharedBuildCalls = 0;
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
      ...editorPersistence,
      resolveStudioPersistedHtmlReuse(persistedDeckState, options = {}) {
        delegatedArgs = { persistedDeckState, options };
        return persistedDeckState.cleanHtml;
      },
      isStudioPersistedCanonicalDeck() {
        throw new Error('fallback canonical comparison should not run when persisted html reuse is delegated');
      }
    },
    buildEditorCanonicalDeck(nextDoc) {
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
  loadGetCurrentEditorPersistedDeckState(fileContent, context);
  vm.runInContext(resolveEditorFallbackActiveSlideIdSource, context);
  vm.runInContext(getEditorDeckSanitizerOptionsSource, context);
  vm.runInContext(buildPersistableDeckHtmlSource, context);

  assert.equal(context.buildPersistableDeckHtml(), '<html>persisted-baseline</html>');
  assert.equal(sharedBuildCalls, 0);
  assert.equal(delegatedArgs.persistedDeckState.cleanHtml, '<html>persisted-baseline</html>');
  assert.equal(delegatedArgs.persistedDeckState.canonicalDeck, canonicalDeck);
  assert.equal(delegatedArgs.options.canonicalDeck, canonicalDeck);
});

test('buildPersistableDeckHtml prefers the shared persisted-content resolver before checking html reuse', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const resolveEditorFallbackActiveSlideIdSource = extractFunctionSource(
    fileContent,
    'function resolveEditorFallbackActiveSlideId(doc = getIframeDoc(), canonicalDeck = null) {',
    '\n\n    function buildEditorPreviewHtml(doc = getIframeDoc()) {'
  );
  const getEditorDeckSanitizerOptionsSource = extractFunctionSource(
    fileContent,
    'function getEditorDeckSanitizerOptions(options = {}) {',
    '\n\n    function getEditorHistoryOptions(options = {}) {'
  );
  const buildPersistableDeckHtmlSource = extractFunctionSource(
    fileContent,
    'function buildPersistableDeckHtml(doc = getIframeDoc()) {',
    '\n\n    function capturePersistedDeckPlaybackState(doc = getIframeDoc(), canonicalDeck = null) {'
  );

  const canonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: []
  };
  const calls = [];
  const context = {
    EDITOR_CHROME_NODE_IDS: ['editorSelectionOverlay'],
    EDITOR_ELEMENT_ID_ATTR: 'data-editor-id',
    EDITOR_SLIDE_ID_ATTR: 'data-slide-id',
    SlideNextDeckPersistence: {
      buildPersistableDeckHtml() {
        throw new Error('shared persistence builder should not run when persisted html reuse succeeds');
      }
    },
    SlideNextStudioEditorPersistence: {
      ...editorPersistence,
      resolveStudioPersistableDeckStateWithContent(persistedDeckState) {
        calls.push(['resolveStudioPersistableDeckStateWithContent', persistedDeckState]);
        return persistedDeckState;
      },
      resolveStudioPersistedHtmlReuse(persistedDeckState, options = {}) {
        calls.push(['resolveStudioPersistedHtmlReuse', persistedDeckState, options]);
        return persistedDeckState.cleanHtml;
      }
    },
    buildEditorCanonicalDeck(nextDoc) {
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
  loadGetCurrentEditorPersistedDeckState(fileContent, context);
  vm.runInContext(resolveEditorFallbackActiveSlideIdSource, context);
  vm.runInContext(getEditorDeckSanitizerOptionsSource, context);
  vm.runInContext(buildPersistableDeckHtmlSource, context);

  assert.equal(context.buildPersistableDeckHtml(), '<html>persisted-baseline</html>');
  assert.deepEqual(calls.map(([name]) => name), [
    'resolveStudioPersistableDeckStateWithContent',
    'resolveStudioPersistedHtmlReuse'
  ]);
  assert.equal(calls[1][1].cleanHtml, '<html>persisted-baseline</html>');
  assert.equal(calls[1][2].canonicalDeck, canonicalDeck);
});

test('buildPersistableDeckHtml sanitizes reusable persisted html when a DOM parser is available', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const resolveEditorFallbackActiveSlideIdSource = extractFunctionSource(
    fileContent,
    'function resolveEditorFallbackActiveSlideId(doc = getIframeDoc(), canonicalDeck = null) {',
    '\n\n    function buildEditorPreviewHtml(doc = getIframeDoc()) {'
  );
  const getEditorDeckSanitizerOptionsSource = extractFunctionSource(
    fileContent,
    'function getEditorDeckSanitizerOptions(options = {}) {',
    '\n\n    function getEditorHistoryOptions(options = {}) {'
  );
  const buildPersistableDeckHtmlSource = extractFunctionSource(
    fileContent,
    'function buildPersistableDeckHtml(doc = getIframeDoc()) {',
    '\n\n    function capturePersistedDeckPlaybackState(doc = getIframeDoc(), canonicalDeck = null) {'
  );

  const canonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: []
  };
  const parsedDoc = {
    documentElement: { outerHTML: '<html>parsed</html>' }
  };
  const playbackState = {
    activeSlideIds: ['slide-3'],
    slideCounterText: '3 / 5'
  };
  const parserCalls = [];
  const buildCalls = [];
  const context = {
    EDITOR_CHROME_NODE_IDS: ['editorSelectionOverlay'],
    EDITOR_ELEMENT_ID_ATTR: 'data-editor-id',
    EDITOR_SLIDE_ID_ATTR: 'data-slide-id',
    DOMParser: class DOMParser {
      parseFromString(html, type) {
        parserCalls.push([html, type]);
        return parsedDoc;
      }
    },
    SlideNextDeckLoader: {
      resolvePresentationPersistenceOptions(metadata) {
        assert.equal(metadata, context.currentPresentationMetadata);
        return {
          emptyContainerIds: ['pixelMatrix']
        };
      }
    },
    SlideNextDeckPersistence: {
      buildPersistableDeckHtml(nextDoc, options) {
        buildCalls.push([nextDoc, options]);
        return '<html>sanitized-baseline</html>';
      }
    },
    SlideNextStudioEditorPersistence: {
      ...editorPersistence,
      resolveStudioPersistedHtmlReuse(persistedDeckState, options = {}) {
        assert.equal(persistedDeckState.playbackState, playbackState);
        assert.equal(options.canonicalDeck, canonicalDeck);
        return persistedDeckState.cleanHtml;
      }
    },
    buildEditorCanonicalDeck(nextDoc) {
      assert.equal(nextDoc, null);
      return canonicalDeck;
    },
    currentPresentationMetadata: {
      id: 'computer-vision-presentation',
      persistence: {
        emptyContainerIds: ['pixelMatrix']
      }
    },
    getIframeDoc() {
      return null;
    },
    lastPersistedDeckHtml: '<html>persisted-baseline</html>',
    lastPersistedCanonicalDeck: canonicalDeck,
    persistedDeckPlaybackState: playbackState
  };

  vm.createContext(context);
  loadGetCurrentEditorPersistedDeckState(fileContent, context);
  vm.runInContext(resolveEditorFallbackActiveSlideIdSource, context);
  vm.runInContext(getEditorDeckSanitizerOptionsSource, context);
  vm.runInContext(buildPersistableDeckHtmlSource, context);

  assert.equal(context.buildPersistableDeckHtml(), '<html>sanitized-baseline</html>');
  assert.deepEqual(parserCalls, [['<html>persisted-baseline</html>', 'text/html']]);
  assert.equal(buildCalls.length, 1);
  assert.equal(buildCalls[0][0], parsedDoc);
  assert.deepEqual(
    JSON.parse(JSON.stringify(buildCalls[0][1])),
    {
      emptyContainerIds: ['pixelMatrix'],
      editorChromeNodeIds: ['editor-style-tag', 'editor-theme-override-tag', 'editorSelectionOverlay'],
      editorTransientClasses: ['editor-selected', 'editor-hoverable', 'editor-dragging'],
      editorElementIdAttr: 'data-editor-id',
      editorSlideIdAttr: 'data-slide-id',
      persistedDeckPlaybackState: playbackState
    }
  );
});

test('buildPersistableDeckHtml captures the live playback state before persisting iframe html', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const getEditorDeckSanitizerOptionsSource = extractFunctionSource(
    fileContent,
    'function getEditorDeckSanitizerOptions(options = {}) {',
    '\n\n    function getEditorHistoryOptions(options = {}) {'
  );
  const buildPersistableDeckHtmlSource = extractFunctionSource(
    fileContent,
    'function buildPersistableDeckHtml(doc = getIframeDoc()) {',
    '\n\n    function capturePersistedDeckPlaybackState(doc = getIframeDoc(), canonicalDeck = null) {'
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
  vm.runInContext(getEditorDeckSanitizerOptionsSource, context);
  vm.runInContext(buildPersistableDeckHtmlSource, context);

  assert.equal(context.buildPersistableDeckHtml(), '<html>persisted-live</html>');
  assert.deepEqual(calls.map(([name]) => name), [
    'capturePersistedDeckPlaybackState',
    'buildPersistableDeckHtml'
  ]);
  assert.equal(calls[1][1], iframeDoc);
  assert.deepEqual(
    JSON.parse(JSON.stringify(calls[1][2].editorChromeNodeIds)),
    ['editor-style-tag', 'editor-theme-override-tag', 'editorSelectionOverlay']
  );
  assert.deepEqual(
    JSON.parse(JSON.stringify(calls[1][2].editorTransientClasses)),
    ['editor-selected', 'editor-hoverable', 'editor-dragging']
  );
  assert.equal(calls[1][2].editorElementIdAttr, 'data-editor-id');
  assert.equal(calls[1][2].editorSlideIdAttr, 'data-slide-id');
  assert.equal(calls[1][2].persistedDeckPlaybackState, livePlaybackState);
});

test('buildPersistableDeckHtml forwards metadata-derived persistence cleanup options when persisting live iframe html', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const getEditorDeckSanitizerOptionsSource = extractFunctionSource(
    fileContent,
    'function getEditorDeckSanitizerOptions(options = {}) {',
    '\n\n    function getEditorHistoryOptions(options = {}) {'
  );
  const buildPersistableDeckHtmlSource = extractFunctionSource(
    fileContent,
    'function buildPersistableDeckHtml(doc = getIframeDoc()) {',
    '\n\n    function capturePersistedDeckPlaybackState(doc = getIframeDoc(), canonicalDeck = null) {'
  );

  const iframeDoc = { label: 'iframe-doc' };
  const livePlaybackState = {
    activeSlideIds: ['slide-3'],
    slideCounterText: '3 / 5'
  };
  const currentPresentationMetadata = {
    id: 'computer-vision-presentation',
    persistence: {
      emptyContainerIds: ['pixelMatrix'],
      styleCleanups: [
        {
          selector: '.glass-panel, h1',
          properties: ['transform', 'opacity']
        }
      ]
    }
  };
  const calls = [];
  const context = {
    EDITOR_CHROME_NODE_IDS: ['editorSelectionOverlay'],
    EDITOR_ELEMENT_ID_ATTR: 'data-editor-id',
    EDITOR_SLIDE_ID_ATTR: 'data-slide-id',
    SlideNextDeckLoader: {
      resolvePresentationPersistenceOptions(metadata) {
        calls.push(['resolvePresentationPersistenceOptions', metadata]);
        assert.equal(metadata, currentPresentationMetadata);
        return {
          emptyContainerIds: ['pixelMatrix'],
          styleCleanups: [
            {
              selector: '.glass-panel, h1',
              properties: ['transform', 'opacity']
            }
          ]
        };
      }
    },
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
    currentPresentationMetadata,
    getIframeDoc() {
      return iframeDoc;
    }
  };

  vm.createContext(context);
  vm.runInContext(getEditorDeckSanitizerOptionsSource, context);
  vm.runInContext(buildPersistableDeckHtmlSource, context);

  assert.equal(context.buildPersistableDeckHtml(), '<html>persisted-live</html>');
  assert.deepEqual(calls.map(([name]) => name), [
    'capturePersistedDeckPlaybackState',
    'resolvePresentationPersistenceOptions',
    'buildPersistableDeckHtml'
  ]);
  assert.equal(calls[2][1], iframeDoc);
  assert.deepEqual(
    JSON.parse(JSON.stringify(calls[2][2].emptyContainerIds)),
    ['pixelMatrix']
  );
  assert.deepEqual(
    JSON.parse(JSON.stringify(calls[2][2].styleCleanups)),
    [
      {
        selector: '.glass-panel, h1',
        properties: ['transform', 'opacity']
      }
    ]
  );
  assert.equal(calls[2][2].persistedDeckPlaybackState, livePlaybackState);
});

test('buildPersistableDeckHtml prefers the shared merged persistence resolver when persisting live iframe html', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const getEditorDeckSanitizerOptionsSource = extractFunctionSource(
    fileContent,
    'function getEditorDeckSanitizerOptions(options = {}) {',
    '\n\n    function getEditorHistoryOptions(options = {}) {'
  );
  const buildPersistableDeckHtmlSource = extractFunctionSource(
    fileContent,
    'function buildPersistableDeckHtml(doc = getIframeDoc()) {',
    '\n\n    function capturePersistedDeckPlaybackState(doc = getIframeDoc(), canonicalDeck = null) {'
  );

  const iframeDoc = { label: 'iframe-doc' };
  const livePlaybackState = {
    activeSlideIds: ['slide-3'],
    slideCounterText: '3 / 5'
  };
  const currentPresentationMetadata = {
    id: 'computer-vision-presentation',
    persistence: {
      emptyContainerIds: ['pixelMatrix']
    }
  };
  const calls = [];
  const context = {
    EDITOR_CHROME_NODE_IDS: ['editorSelectionOverlay'],
    EDITOR_ELEMENT_ID_ATTR: 'data-editor-id',
    EDITOR_SLIDE_ID_ATTR: 'data-slide-id',
    SlideNextDeckLoader: {
      resolveMergedPresentationPersistenceOptions(metadata, explicitOptions) {
        calls.push(['resolveMergedPresentationPersistenceOptions', metadata, explicitOptions]);
        assert.equal(metadata, currentPresentationMetadata);
        assert.equal(explicitOptions, undefined);
        return {
          emptyContainerIds: ['pixelMatrix'],
          transientClassNames: ['revealed']
        };
      },
      resolvePresentationPersistenceOptions() {
        throw new Error('resolvePresentationPersistenceOptions should not run when merged resolver is available');
      }
    },
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
    currentPresentationMetadata,
    getIframeDoc() {
      return iframeDoc;
    }
  };

  vm.createContext(context);
  vm.runInContext(getEditorDeckSanitizerOptionsSource, context);
  vm.runInContext(buildPersistableDeckHtmlSource, context);

  assert.equal(context.buildPersistableDeckHtml(), '<html>persisted-live</html>');
  assert.deepEqual(calls.map(([name]) => name), [
    'capturePersistedDeckPlaybackState',
    'resolveMergedPresentationPersistenceOptions',
    'buildPersistableDeckHtml'
  ]);
  assert.equal(calls[2][1], iframeDoc);
  assert.deepEqual(
    JSON.parse(JSON.stringify(calls[2][2].emptyContainerIds)),
    ['pixelMatrix']
  );
  assert.deepEqual(
    JSON.parse(JSON.stringify(calls[2][2].transientClassNames)),
    ['revealed']
  );
  assert.equal(calls[2][2].persistedDeckPlaybackState, livePlaybackState);
});

test('buildPersistableDeckHtml does not reuse stale persisted playback state when the live iframe has no playback markers', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const getEditorDeckSanitizerOptionsSource = extractFunctionSource(
    fileContent,
    'function getEditorDeckSanitizerOptions(options = {}) {',
    '\n\n    function getEditorHistoryOptions(options = {}) {'
  );
  const buildPersistableDeckHtmlSource = extractFunctionSource(
    fileContent,
    'function buildPersistableDeckHtml(doc = getIframeDoc()) {',
    '\n\n    function capturePersistedDeckPlaybackState(doc = getIframeDoc(), canonicalDeck = null) {'
  );

  const iframeDoc = { label: 'iframe-doc' };
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
      return null;
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
  vm.runInContext(getEditorDeckSanitizerOptionsSource, context);
  vm.runInContext(buildPersistableDeckHtmlSource, context);

  assert.equal(context.buildPersistableDeckHtml(), '<html>persisted-live</html>');
  assert.deepEqual(calls.map(([name]) => name), [
    'capturePersistedDeckPlaybackState',
    'buildPersistableDeckHtml'
  ]);
  assert.equal(calls[1][1], iframeDoc);
  assert.equal(calls[1][2].persistedDeckPlaybackState, null);
});

test('buildPersistableDeckHtml reuses a provided canonical deck when playback-state fallback needs the current session slide', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const resolveEditorFallbackActiveSlideIdSource = extractFunctionSource(
    fileContent,
    'function resolveEditorFallbackActiveSlideId(doc = getIframeDoc(), canonicalDeck = null) {',
    '\n\n    function buildEditorPreviewHtml(doc = getIframeDoc()) {'
  );
  const getEditorDeckSanitizerOptionsSource = extractFunctionSource(
    fileContent,
    'function getEditorDeckSanitizerOptions(options = {}) {',
    '\n\n    function getEditorHistoryOptions(options = {}) {'
  );
  const buildPersistableDeckHtmlSource = extractFunctionSource(
    fileContent,
    'function buildPersistableDeckHtml(doc = getIframeDoc()) {',
    '\n\n    function capturePersistedDeckPlaybackState(doc = getIframeDoc(), canonicalDeck = null) {'
  );
  const capturePersistedDeckPlaybackStateSource = extractFunctionSource(
    fileContent,
    'function capturePersistedDeckPlaybackState(doc = getIframeDoc(), canonicalDeck = null) {',
    '\n\n    function buildEditorSaveRequestBody(doc = getIframeDoc(), cleanHtml = null, options = {}) {'
  );

  const iframeDoc = {
    label: 'iframe-doc',
    querySelector(selector) {
      assert.equal(selector, '.slide-active');
      return null;
    }
  };
  const canonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: [
      { id: 'slide-1', nodes: [] },
      { id: 'slide-2', nodes: [] }
    ]
  };
  let buildEditorCanonicalDeckCalls = 0;
  const context = {
    EDITOR_CHROME_NODE_IDS: ['editorSelectionOverlay'],
    EDITOR_ELEMENT_ID_ATTR: 'data-editor-id',
    EDITOR_SLIDE_ID_ATTR: 'data-slide-id',
    SlideNextDeckPersistence: {
      buildPersistableDeckHtml(nextDoc, options) {
        assert.equal(nextDoc, iframeDoc);
        assert.deepEqual(
          JSON.parse(JSON.stringify(options.persistedDeckPlaybackState)),
          {
            activeSlideIds: ['slide-2'],
            slideCounterText: '2 / 5'
          }
        );
        return '<html>persisted-live</html>';
      },
      capturePersistedDeckPlaybackState(nextDoc, options) {
        assert.equal(nextDoc, iframeDoc);
        assert.equal(options.getSlides, context.getSlides);
        assert.equal(options.slideIdAttr, 'data-slide-id');
        return {
          activeSlideIds: [],
          slideCounterText: '2 / 5'
        };
      }
    },
    buildEditorCanonicalDeck() {
      buildEditorCanonicalDeckCalls += 1;
      return canonicalDeck;
    },
    currentSlideIndex: 1,
    getActiveSlideId(nextDoc) {
      assert.equal(nextDoc, iframeDoc);
      return '';
    },
    getIframeDoc() {
      return iframeDoc;
    },
    getPersistedActiveSlideId() {
      return 'slide-stale';
    },
    getSlides() {
      return [];
    },
    persistedDeckPlaybackState: {
      activeSlideIds: ['slide-stale'],
      slideCounterText: '1 / 5'
    }
  };

  vm.createContext(context);
  loadGetCurrentEditorPersistedDeckState(fileContent, context);
  vm.runInContext(resolveEditorFallbackActiveSlideIdSource, context);
  vm.runInContext(getEditorDeckSanitizerOptionsSource, context);
  vm.runInContext(capturePersistedDeckPlaybackStateSource, context);
  vm.runInContext(buildPersistableDeckHtmlSource, context);

  assert.equal(
    context.buildPersistableDeckHtml(iframeDoc, {
      canonicalDeck
    }),
    '<html>persisted-live</html>'
  );
  assert.equal(buildEditorCanonicalDeckCalls, 0);
});

test('capturePersistedDeckPlaybackState preserves explicit live active slide ids from shared playback capture', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const resolveEditorFallbackActiveSlideIdSource = extractFunctionSource(
    fileContent,
    'function resolveEditorFallbackActiveSlideId(doc = getIframeDoc(), canonicalDeck = null) {',
    '\n\n    function buildEditorPreviewHtml(doc = getIframeDoc()) {'
  );
  const capturePersistedDeckPlaybackStateSource = extractFunctionSource(
    fileContent,
    'function capturePersistedDeckPlaybackState(doc = getIframeDoc(), canonicalDeck = null) {',
    '\n\n    function buildEditorSaveRequestBody(doc = getIframeDoc(), cleanHtml = null, options = {}) {'
  );

  const iframeDoc = {
    label: 'iframe-doc',
    querySelector(selector) {
      assert.equal(selector, '.slide-active');
      return { label: 'active-slide' };
    }
  };
  const playbackState = {
    activeSlideIds: ['slide-live'],
    slideCounterText: '2 / 5'
  };
  let buildEditorCanonicalDeckCalls = 0;
  const context = {
    EDITOR_SLIDE_ID_ATTR: 'data-slide-id',
    SlideNextDeckPersistence: {
      capturePersistedDeckPlaybackState(nextDoc, options) {
        assert.equal(nextDoc, iframeDoc);
        assert.equal(options.getSlides, context.getSlides);
        assert.equal(options.slideIdAttr, 'data-slide-id');
        return playbackState;
      }
    },
    buildEditorCanonicalDeck() {
      buildEditorCanonicalDeckCalls += 1;
      return {
        kind: 'slidenext.deck',
        schemaVersion: 1,
        slides: []
      };
    },
    getActiveSlideId(nextDoc) {
      assert.equal(nextDoc, iframeDoc);
      return 'slide-live';
    },
    getIframeDoc() {
      return iframeDoc;
    },
    getPersistedActiveSlideId() {
      return 'slide-stale';
    },
    getSlides() {
      return [];
    }
  };

  vm.createContext(context);
  vm.runInContext(resolveEditorFallbackActiveSlideIdSource, context);
  vm.runInContext(capturePersistedDeckPlaybackStateSource, context);

  assert.equal(context.capturePersistedDeckPlaybackState(), playbackState);
  assert.equal(buildEditorCanonicalDeckCalls, 0);
});

test('capturePersistedDeckPlaybackState delegates fallback active slide resolution to the shared deck persistence helper when available', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const resolveEditorFallbackActiveSlideIdSource = extractFunctionSource(
    fileContent,
    'function resolveEditorFallbackActiveSlideId(doc = getIframeDoc(), canonicalDeck = null) {',
    '\n\n    function buildEditorPreviewHtml(doc = getIframeDoc()) {'
  );
  const capturePersistedDeckPlaybackStateSource = extractFunctionSource(
    fileContent,
    'function capturePersistedDeckPlaybackState(doc = getIframeDoc(), canonicalDeck = null) {',
    '\n\n    function buildEditorSaveRequestBody(doc = getIframeDoc(), cleanHtml = null, options = {}) {'
  );

  const iframeDoc = {
    label: 'iframe-doc',
    querySelector(selector) {
      assert.equal(selector, '.slide-active');
      return null;
    }
  };
  const canonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: [
      { id: 'slide-1', nodes: [] },
      { id: 'slide-2', nodes: [] }
    ]
  };
  const playbackState = {
    activeSlideIds: [],
    slideCounterText: '2 / 5'
  };
  let delegatedArgs = null;
  let buildEditorCanonicalDeckCalls = 0;
  const context = {
    EDITOR_SLIDE_ID_ATTR: 'data-slide-id',
    SlideNextDeckPersistence: {
      capturePersistedDeckPlaybackState(nextDoc, options) {
        assert.equal(nextDoc, iframeDoc);
        assert.equal(options.getSlides, context.getSlides);
        assert.equal(options.slideIdAttr, 'data-slide-id');
        return playbackState;
      },
      ensurePersistedDeckPlaybackStateActiveSlideId(nextPlaybackState, options) {
        delegatedArgs = {
          nextPlaybackState,
          options,
          fallbackActiveSlideId: options.resolveFallbackActiveSlideId(nextPlaybackState)
        };
        return {
          activeSlideIds: [delegatedArgs.fallbackActiveSlideId],
          slideCounterText: nextPlaybackState.slideCounterText
        };
      }
    },
    buildEditorCanonicalDeck(nextDoc) {
      buildEditorCanonicalDeckCalls += 1;
      assert.equal(nextDoc, iframeDoc);
      return canonicalDeck;
    },
    currentSlideIndex: 1,
    getActiveSlideId(nextDoc) {
      assert.equal(nextDoc, iframeDoc);
      return '';
    },
    getIframeDoc() {
      return iframeDoc;
    },
    getPersistedActiveSlideId() {
      return 'slide-stale';
    },
    getSlides() {
      return [];
    }
  };

  vm.createContext(context);
  vm.runInContext(resolveEditorFallbackActiveSlideIdSource, context);
  vm.runInContext(capturePersistedDeckPlaybackStateSource, context);

  assert.deepEqual(
    JSON.parse(JSON.stringify(context.capturePersistedDeckPlaybackState())),
    {
      activeSlideIds: ['slide-2'],
      slideCounterText: '2 / 5'
    }
  );
  assert.equal(delegatedArgs.nextPlaybackState, playbackState);
  assert.equal(typeof delegatedArgs.options.resolveFallbackActiveSlideId, 'function');
  assert.equal(delegatedArgs.fallbackActiveSlideId, 'slide-2');
  assert.equal(buildEditorCanonicalDeckCalls, 1);
});

test('capturePersistedDeckPlaybackState falls back to the current session slide when shared playback capture has no active slide ids', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const resolveEditorFallbackActiveSlideIdSource = extractFunctionSource(
    fileContent,
    'function resolveEditorFallbackActiveSlideId(doc = getIframeDoc(), canonicalDeck = null) {',
    '\n\n    function buildEditorPreviewHtml(doc = getIframeDoc()) {'
  );
  const capturePersistedDeckPlaybackStateSource = extractFunctionSource(
    fileContent,
    'function capturePersistedDeckPlaybackState(doc = getIframeDoc(), canonicalDeck = null) {',
    '\n\n    function buildEditorSaveRequestBody(doc = getIframeDoc(), cleanHtml = null, options = {}) {'
  );

  const iframeDoc = {
    label: 'iframe-doc',
    querySelector(selector) {
      assert.equal(selector, '.slide-active');
      return null;
    }
  };
  const canonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: [
      { id: 'slide-1', nodes: [] },
      { id: 'slide-2', nodes: [] }
    ]
  };
  let buildEditorCanonicalDeckCalls = 0;
  const context = {
    EDITOR_SLIDE_ID_ATTR: 'data-slide-id',
    SlideNextDeckPersistence: {
      capturePersistedDeckPlaybackState(nextDoc, options) {
        assert.equal(nextDoc, iframeDoc);
        assert.equal(options.getSlides, context.getSlides);
        assert.equal(options.slideIdAttr, 'data-slide-id');
        return {
          activeSlideIds: [],
          slideCounterText: '2 / 5'
        };
      }
    },
    buildEditorCanonicalDeck(nextDoc) {
      buildEditorCanonicalDeckCalls += 1;
      assert.equal(nextDoc, iframeDoc);
      return canonicalDeck;
    },
    currentSlideIndex: 1,
    getActiveSlideId(nextDoc) {
      assert.equal(nextDoc, iframeDoc);
      return '';
    },
    getIframeDoc() {
      return iframeDoc;
    },
    getPersistedActiveSlideId() {
      return 'slide-stale';
    },
    getSlides() {
      return [];
    }
  };

  vm.createContext(context);
  vm.runInContext(resolveEditorFallbackActiveSlideIdSource, context);
  vm.runInContext(capturePersistedDeckPlaybackStateSource, context);

  assert.deepEqual(
    JSON.parse(JSON.stringify(context.capturePersistedDeckPlaybackState())),
    {
      activeSlideIds: ['slide-2'],
      slideCounterText: '2 / 5'
    }
  );
  assert.equal(buildEditorCanonicalDeckCalls, 1);
});

test('buildPersistableDeckHtml reports the resolved live canonical deck when requested', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const getEditorDeckSanitizerOptionsSource = extractFunctionSource(
    fileContent,
    'function getEditorDeckSanitizerOptions(options = {}) {',
    '\n\n    function getEditorHistoryOptions(options = {}) {'
  );
  const buildPersistableDeckHtmlSource = extractFunctionSource(
    fileContent,
    'function buildPersistableDeckHtml(doc = getIframeDoc()) {',
    '\n\n    function capturePersistedDeckPlaybackState(doc = getIframeDoc(), canonicalDeck = null) {'
  );

  const iframeDoc = { label: 'iframe-doc' };
  const canonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: []
  };
  let reportedCanonicalDeck = null;
  let buildEditorCanonicalDeckCalls = 0;
  const context = {
    EDITOR_CHROME_NODE_IDS: ['editorSelectionOverlay'],
    EDITOR_ELEMENT_ID_ATTR: 'data-editor-id',
    EDITOR_SLIDE_ID_ATTR: 'data-slide-id',
    SlideNextDeckPersistence: {
      buildPersistableDeckHtml(nextDoc) {
        assert.equal(nextDoc, iframeDoc);
        return '<html>persisted-live</html>';
      }
    },
    buildEditorCanonicalDeck(nextDoc) {
      buildEditorCanonicalDeckCalls += 1;
      assert.equal(nextDoc, iframeDoc);
      return canonicalDeck;
    },
    capturePersistedDeckPlaybackState(nextDoc) {
      assert.equal(nextDoc, iframeDoc);
      return null;
    },
    getIframeDoc() {
      return iframeDoc;
    },
    persistedDeckPlaybackState: null
  };

  vm.createContext(context);
  vm.runInContext(getEditorDeckSanitizerOptionsSource, context);
  vm.runInContext(buildPersistableDeckHtmlSource, context);

  assert.equal(
    context.buildPersistableDeckHtml(iframeDoc, {
      onCanonicalDeckResolved(deck) {
        reportedCanonicalDeck = deck;
      }
    }),
    '<html>persisted-live</html>'
  );
  assert.equal(reportedCanonicalDeck, canonicalDeck);
  assert.equal(buildEditorCanonicalDeckCalls, 1);
});

test('buildPersistableDeckHtml renders canonical deck html when the editor frame and persisted baseline are unavailable', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const resolveEditorFallbackActiveSlideIdSource = extractFunctionSource(
    fileContent,
    'function resolveEditorFallbackActiveSlideId(doc = getIframeDoc(), canonicalDeck = null) {',
    '\n\n    function buildEditorPreviewHtml(doc = getIframeDoc()) {'
  );
  const getEditorDeckSanitizerOptionsSource = extractFunctionSource(
    fileContent,
    'function getEditorDeckSanitizerOptions(options = {}) {',
    '\n\n    function getEditorHistoryOptions(options = {}) {'
  );
  const buildPersistableDeckHtmlSource = extractFunctionSource(
    fileContent,
    'function buildPersistableDeckHtml(doc = getIframeDoc()) {',
    '\n\n    function capturePersistedDeckPlaybackState(doc = getIframeDoc(), canonicalDeck = null) {'
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
      ...editorPersistence,
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
    lastPersistedCanonicalDeck: null,
    persistedDeckPlaybackState: {
      activeSlideIds: ['slide-2']
    }
  };

  vm.createContext(context);
  loadGetCurrentEditorPersistedDeckState(fileContent, context);
  vm.runInContext(resolveEditorFallbackActiveSlideIdSource, context);
  vm.runInContext(getEditorDeckSanitizerOptionsSource, context);
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
  assert.equal(calls[0][1].deckHtmlOptions.renderOptions.preferHeadSourceHtml, false);
  assert.equal(calls[0][1].deckHtmlOptions.renderOptions.preferBodySourceHtml, false);
  assert.equal(calls[0][1].deckHtmlOptions.renderOptions.preferSlideSourceHtml, false);
  assert.equal(calls[0][1].deckHtmlOptions.renderOptions.preferNodeSourceHtml, false);
});

test('createEditorPersistableSourceViewOptions reuses the local deck view build options helper when available', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const createEditorPersistableSourceViewOptionsSource = extractFunctionSource(
    fileContent,
    'function createEditorPersistableSourceViewOptions(doc = getIframeDoc(), canonicalDeck = null, persistedHtml = \'\') {',
    '\n\n    function buildPersistableDeckHtml(doc = getIframeDoc()) {'
  );

  const canonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: []
  };
  const iframeDoc = { label: 'iframe-doc' };
  const sourceViewOptions = {
    buildCanonicalDeck() {
      return canonicalDeck;
    }
  };
  let delegatedArgs = null;
  const renderOptionCalls = [];
  const context = {
    __createEditorDeckViewBuildOptions(nextDoc, options) {
      delegatedArgs = { nextDoc, options };
      return sourceViewOptions;
    },
    buildEditorDeckRenderOptions(nextDoc, nextCanonicalDeck, options = {}) {
      renderOptionCalls.push([nextDoc, nextCanonicalDeck, options]);
      return { activeSlideId: options.activeSlideId || 'slide-1' };
    },
    getIframeDoc() {
      return iframeDoc;
    }
  };

  vm.createContext(context);
  vm.runInContext(createEditorPersistableSourceViewOptionsSource, context);
  vm.runInContext('createEditorDeckViewBuildOptions = __createEditorDeckViewBuildOptions;', context);

  const result = context.createEditorPersistableSourceViewOptions(iframeDoc, canonicalDeck, '<html>persisted</html>');

  assert.equal(result, sourceViewOptions);
  assert.equal(delegatedArgs.nextDoc, iframeDoc);
  assert.equal(delegatedArgs.options.buildCanonicalDeck(), canonicalDeck);
  assert.equal(delegatedArgs.options.buildFallbackHtml(), '<html>persisted</html>');
  assert.deepEqual(
    delegatedArgs.options.buildRenderOptions(iframeDoc, canonicalDeck, { activeSlideId: 'slide-2' }),
    { activeSlideId: 'slide-2' }
  );
  assert.deepEqual(renderOptionCalls, [[iframeDoc, canonicalDeck, { activeSlideId: 'slide-2' }]]);
});

test('buildPersistableDeckHtml reuses createEditorPersistableSourceViewOptions and renderEditorSourceDeckHtml when rendering canonical source without a persisted baseline', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const resolveEditorFallbackActiveSlideIdSource = extractFunctionSource(
    fileContent,
    'function resolveEditorFallbackActiveSlideId(doc = getIframeDoc(), canonicalDeck = null) {',
    '\n\n    function buildEditorPreviewHtml(doc = getIframeDoc()) {'
  );
  const getEditorDeckSanitizerOptionsSource = extractFunctionSource(
    fileContent,
    'function getEditorDeckSanitizerOptions(options = {}) {',
    '\n\n    function getEditorHistoryOptions(options = {}) {'
  );
  const buildPersistableDeckHtmlSource = extractFunctionSource(
    fileContent,
    'function buildPersistableDeckHtml(doc = getIframeDoc()) {',
    '\n\n    function capturePersistedDeckPlaybackState(doc = getIframeDoc(), canonicalDeck = null) {'
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
  const calls = [];
  const context = {
    EDITOR_CHROME_NODE_IDS: ['editorSelectionOverlay'],
    EDITOR_ELEMENT_ID_ATTR: 'data-editor-id',
    EDITOR_SLIDE_ID_ATTR: 'data-slide-id',
    SlideNextDeckPersistence: {
      buildPersistableDeckHtml() {
        throw new Error('live deck sanitizer should not run without a live frame');
      }
    },
    SlideNextStudioEditorPersistence: {
      ...editorPersistence
    },
    createEditorPersistableSourceViewOptions(nextDoc, nextCanonicalDeck, persistedHtml) {
      calls.push(['createEditorPersistableSourceViewOptions', nextDoc, nextCanonicalDeck, persistedHtml]);
      assert.equal(nextDoc, null);
      assert.equal(nextCanonicalDeck, canonicalDeck);
      assert.equal(persistedHtml, '');
      return {
        buildCanonicalDeck() {
          return canonicalDeck;
        }
      };
    },
    renderEditorSourceDeckHtml(nextDoc, sourceViewOptions, options) {
      calls.push([nextDoc, options]);
      assert.equal(sourceViewOptions.buildCanonicalDeck(), canonicalDeck);
      return '<html>canonical-source</html>';
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
    lastPersistedCanonicalDeck: null,
    persistedDeckPlaybackState: {
      activeSlideIds: ['slide-2']
    }
  };

  vm.createContext(context);
  loadGetCurrentEditorPersistedDeckState(fileContent, context);
  vm.runInContext(resolveEditorFallbackActiveSlideIdSource, context);
  vm.runInContext(getEditorDeckSanitizerOptionsSource, context);
  vm.runInContext(buildPersistableDeckHtmlSource, context);

  assert.equal(context.buildPersistableDeckHtml(), '<html>canonical-source</html>');
  assert.equal(calls.length, 2);
  assert.deepEqual(calls[0], ['createEditorPersistableSourceViewOptions', null, canonicalDeck, '']);
  assert.equal(calls[1][0], null);
  assert.equal(typeof calls[1][1].buildFallbackHtml, 'function');
  assert.equal(calls[1][1].buildFallbackHtml(), '');
});

test('buildPersistableDeckHtml prefers rendered canonical html when the current canonical deck differs from the persisted baseline', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const resolveEditorFallbackActiveSlideIdSource = extractFunctionSource(
    fileContent,
    'function resolveEditorFallbackActiveSlideId(doc = getIframeDoc(), canonicalDeck = null) {',
    '\n\n    function buildEditorPreviewHtml(doc = getIframeDoc()) {'
  );
  const getEditorDeckSanitizerOptionsSource = extractFunctionSource(
    fileContent,
    'function getEditorDeckSanitizerOptions(options = {}) {',
    '\n\n    function getEditorHistoryOptions(options = {}) {'
  );
  const buildPersistableDeckHtmlSource = extractFunctionSource(
    fileContent,
    'function buildPersistableDeckHtml(doc = getIframeDoc()) {',
    '\n\n    function capturePersistedDeckPlaybackState(doc = getIframeDoc(), canonicalDeck = null) {'
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
      ...editorPersistence,
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
  loadGetCurrentEditorPersistedDeckState(fileContent, context);
  vm.runInContext(resolveEditorFallbackActiveSlideIdSource, context);
  vm.runInContext(getEditorDeckSanitizerOptionsSource, context);
  vm.runInContext(buildPersistableDeckHtmlSource, context);

  assert.equal(context.buildPersistableDeckHtml(), '<html>canonical-source</html>');
  assert.equal(sharedBuildCalls, 0);
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], null);
  assert.equal(calls[0][1].buildCanonicalDeck(), currentCanonicalDeck);
  assert.equal(calls[0][1].buildFallbackHtml(), '<html>persisted-baseline</html>');
  assert.equal(calls[0][1].deckHtmlOptions.renderOptions.activeSlideId, 'slide-next');
  assert.equal(calls[0][1].deckHtmlOptions.renderOptions.preferSourceHtml, false);
  assert.equal(calls[0][1].deckHtmlOptions.renderOptions.preferHeadSourceHtml, false);
  assert.equal(calls[0][1].deckHtmlOptions.renderOptions.preferBodySourceHtml, false);
  assert.equal(calls[0][1].deckHtmlOptions.renderOptions.preferSlideSourceHtml, false);
  assert.equal(calls[0][1].deckHtmlOptions.renderOptions.preferNodeSourceHtml, false);
});
