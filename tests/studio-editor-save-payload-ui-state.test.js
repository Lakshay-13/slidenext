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
  context.SlideNextStudioEditorPersistence ??= editorPersistence;
  const helperSource = extractFunctionSource(
    fileContent,
    'function getCurrentEditorPersistedDeckState() {',
    '\n\n    function buildEditorDeckSnapshot(doc = getIframeDoc(), options = {}) {'
  );
  vm.runInContext(helperSource, context);
}

function loadBuildPersistableDeckHtml(fileContent, context, helperSource) {
  context.SlideNextStudioEditorPersistence ??= editorPersistence;
  if (typeof context.resolveEditorMetadataPersistenceOptions !== 'function') {
    const resolveEditorMetadataPersistenceOptionsSource = extractFunctionSource(
      fileContent,
      'function resolveEditorMetadataPersistenceOptions(options = {}) {',
      '\n\n    function buildEditorPersistableDeckSanitizerOptions(playbackState = null, options = {}) {'
    );
    vm.runInContext(resolveEditorMetadataPersistenceOptionsSource, context);
  }
  if (typeof context.renderEditorPersistableSourceDeckHtml !== 'function') {
    const renderEditorPersistableSourceDeckHtmlSource = extractFunctionSource(
      fileContent,
      'function renderEditorPersistableSourceDeckHtml(doc = getIframeDoc(), sourceViewOptions = {}, persistedHtml = \'\', options = {}) {',
      '\n\n    function resolveEditorReusablePersistedHtml(persistedDeckState, options = {}) {'
    );
    vm.runInContext(renderEditorPersistableSourceDeckHtmlSource, context);
  }
  if (typeof context.buildEditorPersistableDeckSanitizerOptions !== 'function') {
    const buildEditorPersistableDeckSanitizerOptionsSource = extractFunctionSource(
      fileContent,
      'function buildEditorPersistableDeckSanitizerOptions(playbackState = null, options = {}) {',
      '\n\n    function sanitizeEditorReusablePersistedHtml(persistedHtml, options = {}) {'
    );
    vm.runInContext(buildEditorPersistableDeckSanitizerOptionsSource, context);
  }
  if (typeof context.reportEditorPersistableDeckBuildState !== 'function') {
    const reportEditorPersistableDeckBuildStateSource = extractFunctionSource(
      fileContent,
      'function reportEditorPersistableDeckBuildState(buildOptions = {}, canonicalDeck = null, playbackState = null) {',
      '\n\n    function sanitizeEditorReusablePersistedHtml(persistedHtml, options = {}) {'
    );
    vm.runInContext(reportEditorPersistableDeckBuildStateSource, context);
  }
  if (typeof context.sanitizeEditorReusablePersistedHtml !== 'function') {
    const sanitizeEditorReusablePersistedHtmlSource = extractFunctionSource(
      fileContent,
      'function sanitizeEditorReusablePersistedHtml(persistedHtml, options = {}) {',
      '\n\n    function buildPersistableDeckHtml(doc = getIframeDoc()) {'
    );
    vm.runInContext(sanitizeEditorReusablePersistedHtmlSource, context);
  }
  if (typeof context.resolveEditorReusablePersistedHtml !== 'function') {
    const resolveEditorReusablePersistedHtmlSource = extractFunctionSource(
      fileContent,
      'function resolveEditorReusablePersistedHtml(persistedDeckState, options = {}) {',
      '\n\n    function buildPersistableDeckHtml(doc = getIframeDoc()) {'
    );
    vm.runInContext(resolveEditorReusablePersistedHtmlSource, context);
  }
  if (typeof context.resolveEditorCanonicalDeckOverride !== 'function') {
    const resolveEditorCanonicalDeckOverrideSource = extractFunctionSource(
      fileContent,
      'function resolveEditorCanonicalDeckOverride(canonicalDeck = null, options = {}) {',
      '\n\n    function getPersistedActiveSlideId(playbackState = persistedDeckPlaybackState) {'
    );
    vm.runInContext(resolveEditorCanonicalDeckOverrideSource, context);
  }
  vm.runInContext(helperSource, context);
}

function loadBuildEditorSaveRequestBody(fileContent, context, helperSource) {
  context.SlideNextStudioEditorPersistence ??= editorPersistence;
  if (typeof context.resolveEditorCanonicalDeckOverride !== 'function') {
    const resolveEditorCanonicalDeckOverrideSource = extractFunctionSource(
      fileContent,
      'function resolveEditorCanonicalDeckOverride(canonicalDeck = null, options = {}) {',
      '\n\n    function getPersistedActiveSlideId(playbackState = persistedDeckPlaybackState) {'
    );
    vm.runInContext(resolveEditorCanonicalDeckOverrideSource, context);
  }
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
  loadBuildEditorSaveRequestBody(fileContent, context, buildEditorSaveRequestBodySource);

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
  loadBuildEditorSaveRequestBody(fileContent, context, buildEditorSaveRequestBodySource);

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
  loadBuildEditorSaveRequestBody(fileContent, context, buildEditorSaveRequestBodySource);

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
  loadBuildEditorSaveRequestBody(fileContent, context, buildEditorSaveRequestBodySource);

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
  loadBuildEditorSaveRequestBody(fileContent, context, buildEditorSaveRequestBodySource);

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

test('buildEditorSaveRequestBody reuses the local canonical override helper when capture state omits a canonical deck', () => {
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
    __resolveEditorCanonicalDeckOverride(nextCanonicalDeck, options = {}) {
      calls.push(['resolveEditorCanonicalDeckOverride', nextCanonicalDeck, options.buildCanonicalDeck]);
      assert.equal(nextCanonicalDeck, null);
      assert.equal(typeof options.buildCanonicalDeck, 'function');
      return canonicalDeck;
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
      throw new Error('buildEditorCanonicalDeck should not run when resolveEditorCanonicalDeckOverride is available');
    },
    currentPresentationUrl: 'presentations/onboarding-presentation/index.html',
    getIframeDoc() {
      return doc;
    }
  };

  vm.createContext(context);
  loadBuildEditorSaveRequestBody(fileContent, context, buildEditorSaveRequestBodySource);
  vm.runInContext(
    'resolveEditorCanonicalDeckOverride = __resolveEditorCanonicalDeckOverride;',
    context
  );

  assert.deepEqual(
    context.buildEditorSaveRequestBody(),
    {
      htmlPath: 'presentations/onboarding-presentation/index.html',
      htmlContent: '<html>captured</html>',
      isAutoSave: false,
      canonicalDeck: canonicalDeckModel.createCanonicalDeck(canonicalDeck)
    }
  );
  assert.equal(calls.length, 2);
  assert.equal(calls[0][0], 'captureEditorPersistableDeckState');
  assert.equal(calls[1][0], 'resolveEditorCanonicalDeckOverride');
  assert.equal(calls[1][1], null);
  assert.equal(typeof calls[1][2], 'function');
});

test('resolveEditorPersistedDeckStateWithContent reuses getCurrentEditorPersistedDeckState.resolveWithContent when available', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const calls = [];
  const context = {
    __resolveWithContent(persistedDeckState) {
      calls.push(persistedDeckState);
      return persistedDeckState;
    },
    lastPersistedCanonicalDeck: null,
    lastPersistedDeckHtml: '<html>persisted-baseline</html>',
    persistedDeckPlaybackState: null
  };

  vm.createContext(context);
  loadGetCurrentEditorPersistedDeckState(fileContent, context);
  vm.runInContext('getCurrentEditorPersistedDeckState.resolveWithContent = __resolveWithContent;', context);

  assert.deepEqual(
    JSON.parse(JSON.stringify(context.resolveEditorPersistedDeckStateWithContent())),
    {
      cleanHtml: '<html>persisted-baseline</html>',
      canonicalDeck: null,
      playbackState: null
    }
  );
  assert.deepEqual(JSON.parse(JSON.stringify(calls)), [
    {
      cleanHtml: '<html>persisted-baseline</html>',
      canonicalDeck: null,
      playbackState: null
    }
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
  loadBuildPersistableDeckHtml(fileContent, context, buildPersistableDeckHtmlSource);

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
    __resolveEditorCanonicalDeckOverride(nextCanonicalDeck, options = {}) {
      calls.push(['resolveEditorCanonicalDeckOverride', nextCanonicalDeck, options.buildCanonicalDeck]);
      assert.equal(nextCanonicalDeck, canonicalDeck);
      assert.equal(typeof options.buildCanonicalDeck, 'function');
      return canonicalDeck;
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
  loadBuildPersistableDeckHtml(fileContent, context, buildPersistableDeckHtmlSource);
  vm.runInContext(
    'resolveEditorCanonicalDeckOverride = __resolveEditorCanonicalDeckOverride;',
    context
  );

  assert.equal(
    context.buildPersistableDeckHtml(null, {
      canonicalDeck
    }),
    '<html>persisted-baseline</html>'
  );
  assert.equal(buildEditorCanonicalDeckCalls, 0);
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], 'resolveEditorCanonicalDeckOverride');
  assert.equal(calls[0][1], canonicalDeck);
  assert.equal(typeof calls[0][2], 'function');
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
  loadBuildPersistableDeckHtml(fileContent, context, buildPersistableDeckHtmlSource);

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
  loadBuildPersistableDeckHtml(fileContent, context, buildPersistableDeckHtmlSource);

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

test('resolveEditorReusablePersistedHtml delegates persisted html reuse checks to the shared editor persistence helper when available', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const resolveEditorReusablePersistedHtmlSource = extractFunctionSource(
    fileContent,
    'function resolveEditorReusablePersistedHtml(persistedDeckState, options = {}) {',
    '\n\n    function buildPersistableDeckHtml(doc = getIframeDoc()) {'
  );

  let delegatedArgs = null;
  const canonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: []
  };
  const persistedDeckState = {
    cleanHtml: '<html>persisted-baseline</html>',
    canonicalDeck,
    playbackState: null
  };
  const context = {
    SlideNextStudioEditorPersistence: {
      ...editorPersistence,
      resolveStudioPersistedHtmlReuse(nextPersistedDeckState, options = {}) {
        delegatedArgs = { persistedDeckState: nextPersistedDeckState, options };
        return nextPersistedDeckState.cleanHtml;
      },
      isStudioPersistedCanonicalDeck() {
        throw new Error('fallback canonical comparison should not run when persisted html reuse is delegated');
      }
    }
  };

  vm.createContext(context);
  vm.runInContext(resolveEditorReusablePersistedHtmlSource, context);

  assert.equal(
    context.resolveEditorReusablePersistedHtml(persistedDeckState, {
      canonicalDeck,
      persistedHtml: '<html>persisted-baseline</html>',
      persistedCanonicalDeck: canonicalDeck
    }),
    '<html>persisted-baseline</html>'
  );
  assert.equal(delegatedArgs.persistedDeckState, persistedDeckState);
  assert.equal(delegatedArgs.options.canonicalDeck, canonicalDeck);
});

test('resolveEditorMetadataPersistenceOptions prefers the shared merged persistence resolver when available', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const resolveEditorMetadataPersistenceOptionsSource = extractFunctionSource(
    fileContent,
    'function resolveEditorMetadataPersistenceOptions(options = {}) {',
    '\n\n    function buildPersistableDeckHtml(doc = getIframeDoc()) {'
  );

  const currentPresentationMetadata = {
    id: 'computer-vision-presentation',
    persistence: {
      emptyContainerIds: ['pixelMatrix']
    }
  };
  const calls = [];
  const context = {
    SlideNextDeckLoader: {
      resolveMergedPresentationPersistenceOptions(metadata, explicitOptions) {
        calls.push(['resolveMergedPresentationPersistenceOptions', metadata, explicitOptions]);
        return {
          emptyContainerIds: ['pixelMatrix'],
          transientClassNames: ['revealed']
        };
      },
      resolvePresentationPersistenceOptions() {
        throw new Error('resolvePresentationPersistenceOptions should not run when merged resolver is available');
      }
    },
    currentPresentationMetadata
  };

  vm.createContext(context);
  vm.runInContext(resolveEditorMetadataPersistenceOptionsSource, context);

  assert.deepEqual(
    JSON.parse(JSON.stringify(context.resolveEditorMetadataPersistenceOptions())),
    {
      emptyContainerIds: ['pixelMatrix'],
      transientClassNames: ['revealed']
    }
  );
  assert.deepEqual(
    JSON.parse(JSON.stringify(calls)),
    [[
      'resolveMergedPresentationPersistenceOptions',
      currentPresentationMetadata,
      {}
    ]]
  );
});

test('resolveEditorMetadataPersistenceOptions merges explicit persistence options when the merged resolver is unavailable', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const resolveEditorMetadataPersistenceOptionsSource = extractFunctionSource(
    fileContent,
    'function resolveEditorMetadataPersistenceOptions(options = {}) {',
    '\n\n    function buildPersistableDeckHtml(doc = getIframeDoc()) {'
  );

  const currentPresentationMetadata = {
    id: 'computer-vision-presentation',
    persistence: {
      emptyContainerIds: ['pixelMatrix']
    }
  };
  const calls = [];
  const context = {
    SlideNextDeckLoader: {
      resolvePresentationPersistenceOptions(metadata) {
        calls.push(['resolvePresentationPersistenceOptions', metadata]);
        return {
          emptyContainerIds: ['pixelMatrix']
        };
      }
    },
    SlideNextPresentationMetadata: {
      mergePresentationPersistenceOptions(...optionSets) {
        calls.push(['mergePresentationPersistenceOptions', optionSets]);
        return optionSets.reduce((merged, optionSet) => ({
          ...merged,
          ...(optionSet || {})
        }), {});
      }
    },
    currentPresentationMetadata
  };

  vm.createContext(context);
  vm.runInContext(resolveEditorMetadataPersistenceOptionsSource, context);

  assert.deepEqual(
    JSON.parse(JSON.stringify(context.resolveEditorMetadataPersistenceOptions({
      persistenceOptions: {
        transientClassNames: ['revealed']
      }
    }))),
    {
      emptyContainerIds: ['pixelMatrix'],
      transientClassNames: ['revealed']
    }
  );
  assert.deepEqual(calls[0], ['resolvePresentationPersistenceOptions', currentPresentationMetadata]);
  assert.deepEqual(
    JSON.parse(JSON.stringify(calls[1])),
    [
      'mergePresentationPersistenceOptions',
      [
        { emptyContainerIds: ['pixelMatrix'] },
        { transientClassNames: ['revealed'] }
      ]
    ]
  );
});

test('reportEditorPersistableDeckBuildState reports canonical deck and playback state through build callbacks', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const reportEditorPersistableDeckBuildStateSource = extractFunctionSource(
    fileContent,
    'function reportEditorPersistableDeckBuildState(buildOptions = {}, canonicalDeck = null, playbackState = null) {',
    '\n\n    function sanitizeEditorReusablePersistedHtml(persistedHtml, options = {}) {'
  );

  const canonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: []
  };
  const playbackState = {
    activeSlideIds: ['slide-2']
  };
  let reportedCanonicalDeck = null;
  let reportedPlaybackState = null;
  const context = {};

  vm.createContext(context);
  vm.runInContext(reportEditorPersistableDeckBuildStateSource, context);

  context.reportEditorPersistableDeckBuildState({
    onCanonicalDeckResolved(deck) {
      reportedCanonicalDeck = deck;
    },
    onPlaybackStateResolved(nextPlaybackState) {
      reportedPlaybackState = nextPlaybackState;
    }
  }, canonicalDeck, playbackState);

  assert.equal(reportedCanonicalDeck, canonicalDeck);
  assert.equal(reportedPlaybackState, playbackState);
});

test('buildEditorPersistableDeckSanitizerOptions composes metadata cleanup, chrome filters, and playback state', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const buildEditorPersistableDeckSanitizerOptionsSource = extractFunctionSource(
    fileContent,
    'function buildEditorPersistableDeckSanitizerOptions(playbackState = null, options = {}) {',
    '\n\n    function sanitizeEditorReusablePersistedHtml(persistedHtml, options = {}) {'
  );

  const calls = [];
  const playbackState = {
    activeSlideIds: ['slide-2']
  };
  const context = {};

  vm.createContext(context);
  vm.runInContext(buildEditorPersistableDeckSanitizerOptionsSource, context);

  assert.deepEqual(
    JSON.parse(JSON.stringify(context.buildEditorPersistableDeckSanitizerOptions(playbackState, {
      resolveMetadataPersistenceOptions() {
        calls.push(['resolveMetadataPersistenceOptions']);
        return {
          emptyContainerIds: ['pixelMatrix']
        };
      },
      getDeckSanitizerOptions() {
        calls.push(['getDeckSanitizerOptions']);
        return {
          chromeNodeIds: ['editorSelectionOverlay'],
          transientClassNames: ['revealed'],
          editorElementIdAttr: 'data-editor-id',
          editorSlideIdAttr: 'data-slide-id'
        };
      }
    }))),
    {
      emptyContainerIds: ['pixelMatrix'],
      editorChromeNodeIds: ['editorSelectionOverlay'],
      editorTransientClasses: ['revealed'],
      editorElementIdAttr: 'data-editor-id',
      editorSlideIdAttr: 'data-slide-id',
      persistedDeckPlaybackState: {
        activeSlideIds: ['slide-2']
      }
    }
  );
  assert.deepEqual(calls.map(([name]) => name), [
    'getDeckSanitizerOptions',
    'resolveMetadataPersistenceOptions'
  ]);
});

test('sanitizeEditorReusablePersistedHtml reuses the local persistable deck sanitizer options helper when available', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const sanitizeEditorReusablePersistedHtmlSource = extractFunctionSource(
    fileContent,
    'function sanitizeEditorReusablePersistedHtml(persistedHtml, options = {}) {',
    '\n\n    function buildPersistableDeckHtml(doc = getIframeDoc()) {'
  );

  const playbackState = {
    activeSlideIds: ['slide-2']
  };
  const parsedDoc = {
    documentElement: {
      nodeName: 'HTML'
    }
  };
  const calls = [];
  let delegatedSanitizerOptions = null;
  const context = {
    DOMParser: class DOMParser {
      parseFromString(html, type) {
        calls.push(['parseFromString', html, type]);
        return parsedDoc;
      }
    },
    __buildEditorPersistableDeckSanitizerOptions(nextPlaybackState, options = {}) {
      delegatedSanitizerOptions = {
        playbackState: nextPlaybackState,
        metadataPersistenceOptions: options.resolveMetadataPersistenceOptions(),
        deckSanitizerOptions: options.getDeckSanitizerOptions()
      };
      return {
        emptyContainerIds: ['pixelMatrix'],
        editorChromeNodeIds: ['editorSelectionOverlay'],
        editorTransientClasses: ['revealed'],
        editorElementIdAttr: 'data-editor-id',
        editorSlideIdAttr: 'data-slide-id',
        persistedDeckPlaybackState: nextPlaybackState
      };
    }
  };

  vm.createContext(context);
  vm.runInContext(sanitizeEditorReusablePersistedHtmlSource, context);
  vm.runInContext('buildEditorPersistableDeckSanitizerOptions = __buildEditorPersistableDeckSanitizerOptions;', context);

  assert.equal(
    context.sanitizeEditorReusablePersistedHtml('<html>persisted-baseline</html>', {
      playbackState,
      resolveMetadataPersistenceOptions() {
        calls.push(['resolveMetadataPersistenceOptions']);
        return {
          emptyContainerIds: ['pixelMatrix']
        };
      },
      getDeckSanitizerOptions() {
        calls.push(['getDeckSanitizerOptions']);
        return {
          chromeNodeIds: ['editorSelectionOverlay'],
          transientClassNames: ['revealed'],
          editorElementIdAttr: 'data-editor-id',
          editorSlideIdAttr: 'data-slide-id'
        };
      },
      buildPersistableDeckHtml(nextDoc, options) {
        calls.push(['buildPersistableDeckHtml', nextDoc, options]);
        return '<html>sanitized</html>';
      }
    }),
    '<html>sanitized</html>'
  );
  assert.deepEqual(calls[0], ['parseFromString', '<html>persisted-baseline</html>', 'text/html']);
  assert.deepEqual(calls[1], ['resolveMetadataPersistenceOptions']);
  assert.deepEqual(calls[2], ['getDeckSanitizerOptions']);
  assert.equal(delegatedSanitizerOptions.playbackState, playbackState);
  assert.deepEqual(
    JSON.parse(JSON.stringify(delegatedSanitizerOptions.metadataPersistenceOptions)),
    {
      emptyContainerIds: ['pixelMatrix']
    }
  );
  assert.deepEqual(
    JSON.parse(JSON.stringify(delegatedSanitizerOptions.deckSanitizerOptions)),
    {
      chromeNodeIds: ['editorSelectionOverlay'],
      transientClassNames: ['revealed'],
      editorElementIdAttr: 'data-editor-id',
      editorSlideIdAttr: 'data-slide-id'
    }
  );
  assert.equal(calls[3][0], 'buildPersistableDeckHtml');
  assert.equal(calls[3][1], parsedDoc);
  assert.deepEqual(
    JSON.parse(JSON.stringify(calls[3][2])),
    {
      emptyContainerIds: ['pixelMatrix'],
      editorChromeNodeIds: ['editorSelectionOverlay'],
      editorTransientClasses: ['revealed'],
      editorElementIdAttr: 'data-editor-id',
      editorSlideIdAttr: 'data-slide-id',
      persistedDeckPlaybackState: {
        activeSlideIds: ['slide-2']
      }
    }
  );
});

test('buildPersistableDeckHtml reuses the local reusable persisted html resolver when available', () => {
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
      ...editorPersistence
    },
    __resolveEditorReusablePersistedHtml(persistedDeckState, options = {}) {
      delegatedArgs = { persistedDeckState, options };
      return persistedDeckState.cleanHtml;
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
  loadBuildPersistableDeckHtml(fileContent, context, buildPersistableDeckHtmlSource);
  vm.runInContext('resolveEditorReusablePersistedHtml = __resolveEditorReusablePersistedHtml;', context);

  assert.equal(context.buildPersistableDeckHtml(), '<html>persisted-baseline</html>');
  assert.equal(sharedBuildCalls, 0);
  assert.equal(delegatedArgs.persistedDeckState.cleanHtml, '<html>persisted-baseline</html>');
  assert.equal(delegatedArgs.persistedDeckState.canonicalDeck, canonicalDeck);
  assert.equal(delegatedArgs.options.canonicalDeck, canonicalDeck);
  assert.equal(delegatedArgs.options.persistedHtml, '<html>persisted-baseline</html>');
  assert.equal(delegatedArgs.options.persistedCanonicalDeck, canonicalDeck);
});

test('buildPersistableDeckHtml reuses the local persistable build-state reporter when the editor frame is unavailable', () => {
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

  const calls = [];
  const canonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: []
  };
  const playbackState = {
    activeSlideIds: ['slide-2']
  };
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
      ...editorPersistence
    },
    __reportEditorPersistableDeckBuildState(buildOptions, nextCanonicalDeck, nextPlaybackState) {
      calls.push(['reportEditorPersistableDeckBuildState', buildOptions, nextCanonicalDeck, nextPlaybackState]);
    },
    __resolveEditorReusablePersistedHtml(persistedDeckState) {
      return persistedDeckState.cleanHtml;
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
    persistedDeckPlaybackState: playbackState
  };

  vm.createContext(context);
  loadGetCurrentEditorPersistedDeckState(fileContent, context);
  vm.runInContext(resolveEditorFallbackActiveSlideIdSource, context);
  vm.runInContext(getEditorDeckSanitizerOptionsSource, context);
  loadBuildPersistableDeckHtml(fileContent, context, buildPersistableDeckHtmlSource);
  vm.runInContext('reportEditorPersistableDeckBuildState = __reportEditorPersistableDeckBuildState;', context);
  vm.runInContext('resolveEditorReusablePersistedHtml = __resolveEditorReusablePersistedHtml;', context);

  assert.equal(context.buildPersistableDeckHtml(), '<html>persisted-baseline</html>');
  assert.equal(calls.length, 1);
  assert.equal(calls[0][2], canonicalDeck);
  assert.equal(calls[0][3], playbackState);
});

test('buildPersistableDeckHtml reuses the local persisted deck state-with-content resolver when available', () => {
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

  const calls = [];
  let delegatedArgs = null;
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
        throw new Error('shared persistence builder should not run when persisted html reuse succeeds');
      }
    },
    SlideNextStudioEditorPersistence: {
      ...editorPersistence
    },
    __resolveEditorPersistedDeckStateWithContent(persistedDeckState) {
      calls.push(['resolveEditorPersistedDeckStateWithContent', persistedDeckState]);
      return persistedDeckState;
    },
    __resolveEditorReusablePersistedHtml(persistedDeckState, options = {}) {
      delegatedArgs = { persistedDeckState, options };
      return persistedDeckState.cleanHtml;
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
  loadBuildPersistableDeckHtml(fileContent, context, buildPersistableDeckHtmlSource);
  vm.runInContext('resolveEditorPersistedDeckStateWithContent = __resolveEditorPersistedDeckStateWithContent;', context);
  vm.runInContext('resolveEditorReusablePersistedHtml = __resolveEditorReusablePersistedHtml;', context);

  assert.equal(context.buildPersistableDeckHtml(), '<html>persisted-baseline</html>');
  assert.equal(calls.length, 1);
  assert.deepEqual(JSON.parse(JSON.stringify(calls[0][1])), {
    cleanHtml: '<html>persisted-baseline</html>',
    canonicalDeck,
    playbackState: null
  });
  assert.equal(delegatedArgs.persistedDeckState.cleanHtml, '<html>persisted-baseline</html>');
  assert.equal(delegatedArgs.options.persistedHtml, '<html>persisted-baseline</html>');
});

test('buildPersistableDeckHtml reuses the local reusable persisted html sanitizer when available', () => {
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
  const calls = [];
  const canonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: []
  };
  const playbackState = {
    activeSlideIds: ['slide-2']
  };
  const context = {
    EDITOR_CHROME_NODE_IDS: ['editorSelectionOverlay'],
    EDITOR_ELEMENT_ID_ATTR: 'data-editor-id',
    EDITOR_SLIDE_ID_ATTR: 'data-slide-id',
    __resolveEditorMetadataPersistenceOptions() {
      calls.push(['resolveEditorMetadataPersistenceOptions']);
      return {
        emptyContainerIds: ['pixelMatrix']
      };
    },
    SlideNextDeckPersistence: {
      buildPersistableDeckHtml() {
        sharedBuildCalls += 1;
        return '<html>rebuilt</html>';
      }
    },
    SlideNextStudioEditorPersistence: {
      ...editorPersistence
    },
    __resolveEditorReusablePersistedHtml(persistedDeckState) {
      calls.push(['resolveEditorReusablePersistedHtml', persistedDeckState]);
      return persistedDeckState.cleanHtml;
    },
    __sanitizeEditorReusablePersistedHtml(persistedHtml, options = {}) {
      delegatedArgs = {
        persistedHtml,
        options,
        metadataPersistenceOptions: options.resolveMetadataPersistenceOptions()
      };
      return '<html>sanitized-persisted</html>';
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
    persistedDeckPlaybackState: playbackState
  };

  vm.createContext(context);
  loadGetCurrentEditorPersistedDeckState(fileContent, context);
  vm.runInContext(resolveEditorFallbackActiveSlideIdSource, context);
  vm.runInContext(getEditorDeckSanitizerOptionsSource, context);
  loadBuildPersistableDeckHtml(fileContent, context, buildPersistableDeckHtmlSource);
  vm.runInContext('resolveEditorMetadataPersistenceOptions = __resolveEditorMetadataPersistenceOptions;', context);
  vm.runInContext('resolveEditorReusablePersistedHtml = __resolveEditorReusablePersistedHtml;', context);
  vm.runInContext('sanitizeEditorReusablePersistedHtml = __sanitizeEditorReusablePersistedHtml;', context);

  assert.equal(context.buildPersistableDeckHtml(), '<html>sanitized-persisted</html>');
  assert.equal(sharedBuildCalls, 0);
  assert.deepEqual(calls.map(([name]) => name), [
    'resolveEditorReusablePersistedHtml',
    'resolveEditorMetadataPersistenceOptions'
  ]);
  assert.equal(delegatedArgs.persistedHtml, '<html>persisted-baseline</html>');
  assert.equal(delegatedArgs.options.playbackState, playbackState);
  assert.deepEqual(
    JSON.parse(JSON.stringify(delegatedArgs.metadataPersistenceOptions)),
    {
      emptyContainerIds: ['pixelMatrix']
    }
  );
});

test('buildPersistableDeckHtml reuses the local persistable deck sanitizer options helper when persisting live iframe html', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
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
  const calls = [];
  let delegatedArgs = null;
  const context = {
    __buildEditorPersistableDeckSanitizerOptions(nextPlaybackState, options = {}) {
      delegatedArgs = {
        playbackState: nextPlaybackState,
        metadataPersistenceOptions: options.resolveMetadataPersistenceOptions()
      };
      return {
        emptyContainerIds: ['pixelMatrix'],
        editorChromeNodeIds: ['editorSelectionOverlay'],
        editorTransientClasses: ['revealed'],
        editorElementIdAttr: 'data-editor-id',
        editorSlideIdAttr: 'data-slide-id',
        persistedDeckPlaybackState: nextPlaybackState
      };
    },
    __resolveEditorMetadataPersistenceOptions() {
      calls.push(['resolveEditorMetadataPersistenceOptions']);
      return {
        emptyContainerIds: ['pixelMatrix']
      };
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
    getIframeDoc() {
      return iframeDoc;
    }
  };

  vm.createContext(context);
  loadBuildPersistableDeckHtml(fileContent, context, buildPersistableDeckHtmlSource);
  vm.runInContext('buildEditorPersistableDeckSanitizerOptions = __buildEditorPersistableDeckSanitizerOptions;', context);
  vm.runInContext('resolveEditorMetadataPersistenceOptions = __resolveEditorMetadataPersistenceOptions;', context);

  assert.equal(context.buildPersistableDeckHtml(), '<html>persisted-live</html>');
  assert.equal(delegatedArgs.playbackState, livePlaybackState);
  assert.deepEqual(
    JSON.parse(JSON.stringify(delegatedArgs.metadataPersistenceOptions)),
    {
      emptyContainerIds: ['pixelMatrix']
    }
  );
  assert.deepEqual(calls.map(([name]) => name), [
    'capturePersistedDeckPlaybackState',
    'resolveEditorMetadataPersistenceOptions',
    'buildPersistableDeckHtml'
  ]);
  assert.equal(calls[2][1], iframeDoc);
  assert.deepEqual(
    JSON.parse(JSON.stringify(calls[2][2])),
    {
      emptyContainerIds: ['pixelMatrix'],
      editorChromeNodeIds: ['editorSelectionOverlay'],
      editorTransientClasses: ['revealed'],
      editorElementIdAttr: 'data-editor-id',
      editorSlideIdAttr: 'data-slide-id',
      persistedDeckPlaybackState: {
        activeSlideIds: ['slide-3'],
        slideCounterText: '3 / 5'
      }
    }
  );
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
  loadBuildPersistableDeckHtml(fileContent, context, buildPersistableDeckHtmlSource);

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
  loadBuildPersistableDeckHtml(fileContent, context, buildPersistableDeckHtmlSource);

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
  loadBuildPersistableDeckHtml(fileContent, context, buildPersistableDeckHtmlSource);

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
  loadBuildPersistableDeckHtml(fileContent, context, buildPersistableDeckHtmlSource);

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

test('buildPersistableDeckHtml reuses the local metadata persistence resolver when persisting live iframe html', () => {
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
    __resolveEditorMetadataPersistenceOptions() {
      calls.push(['resolveEditorMetadataPersistenceOptions']);
      return {
        emptyContainerIds: ['pixelMatrix'],
        transientClassNames: ['revealed']
      };
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
  loadBuildPersistableDeckHtml(fileContent, context, buildPersistableDeckHtmlSource);
  vm.runInContext('resolveEditorMetadataPersistenceOptions = __resolveEditorMetadataPersistenceOptions;', context);

  assert.equal(context.buildPersistableDeckHtml(), '<html>persisted-live</html>');
  assert.deepEqual(calls.map(([name]) => name), [
    'capturePersistedDeckPlaybackState',
    'resolveEditorMetadataPersistenceOptions',
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
  loadBuildPersistableDeckHtml(fileContent, context, buildPersistableDeckHtmlSource);

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
    getActiveSlide(nextDoc) {
      assert.equal(nextDoc, iframeDoc);
      return null;
    },
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
  loadBuildPersistableDeckHtml(fileContent, context, buildPersistableDeckHtmlSource);

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
    resolveEditorFallbackCanonicalDeck(nextDoc, nextCanonicalDeck) {
      return nextCanonicalDeck || context.buildEditorCanonicalDeck(nextDoc);
    },
    buildEditorCanonicalDeck(nextDoc) {
      buildEditorCanonicalDeckCalls += 1;
      assert.equal(nextDoc, iframeDoc);
      return canonicalDeck;
    },
    currentSlideIndex: 1,
    getActiveSlide(nextDoc) {
      assert.equal(nextDoc, iframeDoc);
      return null;
    },
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
    resolveEditorFallbackCanonicalDeck(nextDoc, nextCanonicalDeck) {
      return nextCanonicalDeck || context.buildEditorCanonicalDeck(nextDoc);
    },
    buildEditorCanonicalDeck(nextDoc) {
      buildEditorCanonicalDeckCalls += 1;
      assert.equal(nextDoc, iframeDoc);
      return canonicalDeck;
    },
    currentSlideIndex: 1,
    getActiveSlide(nextDoc) {
      assert.equal(nextDoc, iframeDoc);
      return null;
    },
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
  loadBuildPersistableDeckHtml(fileContent, context, buildPersistableDeckHtmlSource);

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

test('buildPersistableDeckHtml reuses the local persistable build-state reporter for live iframe persistence', () => {
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
  const playbackState = {
    activeSlideIds: ['slide-3']
  };
  const calls = [];
  const context = {
    EDITOR_CHROME_NODE_IDS: ['editorSelectionOverlay'],
    EDITOR_ELEMENT_ID_ATTR: 'data-editor-id',
    EDITOR_SLIDE_ID_ATTR: 'data-slide-id',
    __reportEditorPersistableDeckBuildState(buildOptions, nextCanonicalDeck, nextPlaybackState) {
      calls.push(['reportEditorPersistableDeckBuildState', buildOptions, nextCanonicalDeck, nextPlaybackState]);
    },
    SlideNextDeckPersistence: {
      buildPersistableDeckHtml(nextDoc) {
        assert.equal(nextDoc, iframeDoc);
        return '<html>persisted-live</html>';
      }
    },
    buildEditorCanonicalDeck(nextDoc) {
      assert.equal(nextDoc, iframeDoc);
      return canonicalDeck;
    },
    capturePersistedDeckPlaybackState(nextDoc) {
      assert.equal(nextDoc, iframeDoc);
      return playbackState;
    },
    getIframeDoc() {
      return iframeDoc;
    },
    persistedDeckPlaybackState: null
  };

  vm.createContext(context);
  vm.runInContext(getEditorDeckSanitizerOptionsSource, context);
  loadBuildPersistableDeckHtml(fileContent, context, buildPersistableDeckHtmlSource);
  vm.runInContext('reportEditorPersistableDeckBuildState = __reportEditorPersistableDeckBuildState;', context);

  assert.equal(
    context.buildPersistableDeckHtml(iframeDoc, {
      onCanonicalDeckResolved() {},
      onPlaybackStateResolved() {}
    }),
    '<html>persisted-live</html>'
  );
  assert.equal(calls.length, 1);
  assert.equal(calls[0][2], canonicalDeck);
  assert.equal(calls[0][3], playbackState);
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
    buildEditorSourceDeckHtml(nextDoc, options = {}) {
      calls.push(['buildEditorSourceDeckHtml', nextDoc, options]);
      const sourceViewOptions = options.buildViewOptions(nextDoc);
      assert.equal(sourceViewOptions.buildCanonicalDeck(), canonicalDeck);
      assert.equal(sourceViewOptions.buildFallbackHtml(), '');
      return context.SlideNextStudioDeckView.buildStudioSourceHtml(nextDoc, sourceViewOptions);
    },
    createEditorDeckViewBuildOptions(nextDoc, options) {
      assert.equal(nextDoc, null);
      assert.equal(options.buildCanonicalDeck(), canonicalDeck);
      assert.equal(options.buildFallbackHtml(), '');
      return {
        buildCanonicalDeck() {
          return canonicalDeck;
        },
        buildFallbackHtml() {
          return '';
        },
        deckHtmlOptions: {
          renderOptions: {
            activeSlideId: 'slide-1',
            preferSourceHtml: false,
            preferHeadSourceHtml: false,
            preferBodySourceHtml: false,
            preferSlideSourceHtml: false,
            preferNodeSourceHtml: false
          }
        }
      };
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
  loadBuildPersistableDeckHtml(fileContent, context, buildPersistableDeckHtmlSource);

  assert.equal(context.buildPersistableDeckHtml(), '<html>canonical-source</html>');
  assert.equal(sharedBuildCalls, 0);
  assert.equal(calls.length, 2);
  assert.deepEqual(calls[0].slice(0, 2), ['buildEditorSourceDeckHtml', null]);
  assert.equal(typeof calls[0][2].buildViewOptions, 'function');
  const delegatedSourceViewOptions = calls[0][2].buildViewOptions(null);
  assert.equal(typeof delegatedSourceViewOptions.buildCanonicalDeck, 'function');
  assert.equal(delegatedSourceViewOptions.buildCanonicalDeck(null), canonicalDeck);
  assert.equal(delegatedSourceViewOptions.buildFallbackHtml(), '');
  assert.equal(delegatedSourceViewOptions.deckHtmlOptions.renderOptions.activeSlideId, 'slide-1');
  assert.equal(delegatedSourceViewOptions.deckHtmlOptions.renderOptions.preferSourceHtml, false);
  assert.equal(delegatedSourceViewOptions.deckHtmlOptions.renderOptions.preferHeadSourceHtml, false);
  assert.equal(delegatedSourceViewOptions.deckHtmlOptions.renderOptions.preferBodySourceHtml, false);
  assert.equal(delegatedSourceViewOptions.deckHtmlOptions.renderOptions.preferSlideSourceHtml, false);
  assert.equal(delegatedSourceViewOptions.deckHtmlOptions.renderOptions.preferNodeSourceHtml, false);
  assert.equal(calls[1][0], null);
  assert.equal(typeof calls[1][1].buildCanonicalDeck, 'function');
  assert.equal(calls[1][1].buildCanonicalDeck(null), canonicalDeck);
  assert.equal(calls[1][1].buildFallbackHtml(), '');
});

test('buildPersistableDeckHtml reuses the local deck view build options helper when rendering canonical source without a persisted baseline', () => {
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
  const sourceViewOptions = {
    buildCanonicalDeck() {
      return canonicalDeck;
    }
  };
  let delegatedArgs = null;
  const context = {
    EDITOR_CHROME_NODE_IDS: ['editorSelectionOverlay'],
    EDITOR_ELEMENT_ID_ATTR: 'data-editor-id',
    EDITOR_SLIDE_ID_ATTR: 'data-slide-id',
    SlideNextDeckPersistence: {
      buildPersistableDeckHtml() {
        throw new Error('live deck sanitizer should not run without a live frame');
      }
    },
    __createEditorDeckViewBuildOptions(nextDoc, options) {
      delegatedArgs = { nextDoc, options };
      return sourceViewOptions;
    },
    __renderEditorPersistableSourceDeckHtml(nextDoc, nextSourceViewOptions) {
      assert.equal(nextDoc, null);
      assert.equal(nextSourceViewOptions, sourceViewOptions);
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
  loadBuildPersistableDeckHtml(fileContent, context, buildPersistableDeckHtmlSource);
  vm.runInContext('createEditorDeckViewBuildOptions = __createEditorDeckViewBuildOptions;', context);
  vm.runInContext('renderEditorPersistableSourceDeckHtml = __renderEditorPersistableSourceDeckHtml;', context);

  const result = context.buildPersistableDeckHtml();

  assert.equal(result, '<html>canonical-source</html>');
  assert.equal(delegatedArgs.nextDoc, null);
  assert.equal(delegatedArgs.options.buildCanonicalDeck(), canonicalDeck);
  assert.equal(delegatedArgs.options.buildFallbackHtml(), '');
  assert.deepEqual(
    JSON.parse(JSON.stringify(
      delegatedArgs.options.buildRenderOptions(null, canonicalDeck, { activeSlideId: 'slide-2' })
    )),
    {
      activeSlideId: 'slide-2',
      preferSourceHtml: false,
      preferHeadSourceHtml: false,
      preferBodySourceHtml: false,
      preferSlideSourceHtml: false,
      preferNodeSourceHtml: false
    }
  );
});

test('renderEditorPersistableSourceDeckHtml reuses buildEditorSourceDeckHtml when the default renderer is used', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const renderEditorPersistableSourceDeckHtmlSource = extractFunctionSource(
    fileContent,
    'function renderEditorPersistableSourceDeckHtml(doc = getIframeDoc(), sourceViewOptions = {}, persistedHtml = \'\', options = {}) {',
    '\n\n    function resolveEditorReusablePersistedHtml(persistedDeckState, options = {}) {'
  );

  const sourceViewOptions = {
    buildCanonicalDeck() {
      return {
        kind: 'slidenext.deck',
        schemaVersion: 1,
        slides: []
      };
    }
  };
  let delegatedArgs = null;
  const context = {
    __buildEditorSourceDeckHtml(nextDoc, options = {}) {
      delegatedArgs = { nextDoc, options };
      return '<html>canonical-source</html>';
    },
    getIframeDoc() {
      return null;
    }
  };

  vm.createContext(context);
  vm.runInContext(renderEditorPersistableSourceDeckHtmlSource, context);
  vm.runInContext('buildEditorSourceDeckHtml = __buildEditorSourceDeckHtml;', context);

  assert.equal(
    context.renderEditorPersistableSourceDeckHtml(null, sourceViewOptions, '<html>persisted-baseline</html>'),
    '<html>canonical-source</html>'
  );
  assert.equal(delegatedArgs.nextDoc, null);
  assert.equal(typeof delegatedArgs.options.buildViewOptions, 'function');
  const delegatedSourceViewOptions = delegatedArgs.options.buildViewOptions(null);
  assert.equal(typeof delegatedSourceViewOptions.buildCanonicalDeck, 'function');
  assert.deepEqual(
    JSON.parse(JSON.stringify(delegatedSourceViewOptions.buildCanonicalDeck())),
    sourceViewOptions.buildCanonicalDeck()
  );
  assert.equal(typeof delegatedSourceViewOptions.buildFallbackHtml, 'function');
  assert.equal(delegatedSourceViewOptions.buildFallbackHtml(), '<html>persisted-baseline</html>');
});

test('buildPersistableDeckHtml reuses buildEditorSourceDeckHtml when rendering canonical source without a persisted baseline', () => {
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
  const buildEditorSourceDeckHtmlCalls = [];
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
    createEditorDeckViewBuildOptions(nextDoc, options) {
      assert.equal(nextDoc, null);
      assert.equal(options.buildCanonicalDeck(), canonicalDeck);
      assert.equal(options.buildFallbackHtml(), '');
      return {
        buildCanonicalDeck() {
          return canonicalDeck;
        }
      };
    },
    buildEditorSourceDeckHtml(nextDoc, options) {
      buildEditorSourceDeckHtmlCalls.push([nextDoc, options]);
      const sourceViewOptions = options.buildViewOptions(nextDoc);
      assert.equal(sourceViewOptions.buildCanonicalDeck(), canonicalDeck);
      assert.equal(typeof sourceViewOptions.buildFallbackHtml, 'function');
      assert.equal(sourceViewOptions.buildFallbackHtml(), '');
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
  loadBuildPersistableDeckHtml(fileContent, context, buildPersistableDeckHtmlSource);

  assert.equal(context.buildPersistableDeckHtml(), '<html>canonical-source</html>');
  assert.equal(buildEditorSourceDeckHtmlCalls.length, 1);
  assert.equal(buildEditorSourceDeckHtmlCalls[0][0], null);
  assert.equal(typeof buildEditorSourceDeckHtmlCalls[0][1].buildViewOptions, 'function');
  const delegatedSourceViewOptions = buildEditorSourceDeckHtmlCalls[0][1].buildViewOptions(null);
  assert.equal(typeof delegatedSourceViewOptions.buildFallbackHtml, 'function');
  assert.equal(delegatedSourceViewOptions.buildFallbackHtml(), '');
});

test('buildPersistableDeckHtml reuses the local persistable source deck html renderer when rendering canonical source without a persisted baseline', () => {
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
    createEditorDeckViewBuildOptions(nextDoc, options) {
      return {
        buildCanonicalDeck: options.buildCanonicalDeck
      };
    },
    __renderEditorPersistableSourceDeckHtml(nextDoc, sourceViewOptions, persistedHtml) {
      calls.push(['renderEditorPersistableSourceDeckHtml', nextDoc, sourceViewOptions, persistedHtml]);
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
  loadBuildPersistableDeckHtml(fileContent, context, buildPersistableDeckHtmlSource);
  vm.runInContext('renderEditorPersistableSourceDeckHtml = __renderEditorPersistableSourceDeckHtml;', context);

  assert.equal(context.buildPersistableDeckHtml(), '<html>canonical-source</html>');
  assert.equal(calls[0][0], 'renderEditorPersistableSourceDeckHtml');
  assert.equal(calls[0][1], null);
  assert.equal(calls[0][3], '');
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
    buildEditorSourceDeckHtml(nextDoc, options = {}) {
      calls.push(['buildEditorSourceDeckHtml', nextDoc, options]);
      const sourceViewOptions = options.buildViewOptions(nextDoc);
      assert.equal(sourceViewOptions.buildCanonicalDeck(), currentCanonicalDeck);
      assert.equal(sourceViewOptions.buildFallbackHtml(), '<html>persisted-baseline</html>');
      return context.SlideNextStudioDeckView.buildStudioSourceHtml(nextDoc, sourceViewOptions);
    },
    createEditorDeckViewBuildOptions(nextDoc, options) {
      assert.equal(nextDoc, null);
      assert.equal(options.buildCanonicalDeck(), currentCanonicalDeck);
      assert.equal(options.buildFallbackHtml(), '<html>persisted-baseline</html>');
      return {
        buildCanonicalDeck() {
          return currentCanonicalDeck;
        },
        buildFallbackHtml() {
          return '<html>persisted-baseline</html>';
        },
        deckHtmlOptions: {
          renderOptions: {
            activeSlideId: 'slide-next',
            preferSourceHtml: false,
            preferHeadSourceHtml: false,
            preferBodySourceHtml: false,
            preferSlideSourceHtml: false,
            preferNodeSourceHtml: false
          }
        }
      };
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
  loadBuildPersistableDeckHtml(fileContent, context, buildPersistableDeckHtmlSource);

  assert.equal(context.buildPersistableDeckHtml(), '<html>canonical-source</html>');
  assert.equal(sharedBuildCalls, 0);
  assert.equal(calls.length, 2);
  assert.deepEqual(calls[0].slice(0, 2), ['buildEditorSourceDeckHtml', null]);
  const delegatedSourceViewOptions = calls[0][2].buildViewOptions(null);
  assert.equal(delegatedSourceViewOptions.buildCanonicalDeck(), currentCanonicalDeck);
  assert.equal(delegatedSourceViewOptions.buildFallbackHtml(), '<html>persisted-baseline</html>');
  assert.equal(delegatedSourceViewOptions.deckHtmlOptions.renderOptions.activeSlideId, 'slide-next');
  assert.equal(delegatedSourceViewOptions.deckHtmlOptions.renderOptions.preferSourceHtml, false);
  assert.equal(delegatedSourceViewOptions.deckHtmlOptions.renderOptions.preferHeadSourceHtml, false);
  assert.equal(delegatedSourceViewOptions.deckHtmlOptions.renderOptions.preferBodySourceHtml, false);
  assert.equal(delegatedSourceViewOptions.deckHtmlOptions.renderOptions.preferSlideSourceHtml, false);
  assert.equal(delegatedSourceViewOptions.deckHtmlOptions.renderOptions.preferNodeSourceHtml, false);
  assert.equal(calls[1][0], null);
  assert.equal(calls[1][1].buildCanonicalDeck(), currentCanonicalDeck);
});
