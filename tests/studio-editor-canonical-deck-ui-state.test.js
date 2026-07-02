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

function loadResolveEditorStoredCanonicalDeck(fileContent, context) {
  const resolveEditorStoredCanonicalDeckSource = extractFunctionSource(
    fileContent,
    'function resolveEditorStoredCanonicalDeck(metadata) {',
    '\n\n    function setCurrentPresentationCanonicalDeck('
  );
  vm.runInContext(resolveEditorStoredCanonicalDeckSource, context);
}

function loadResolveEditorCanonicalDeckViewState(fileContent, context) {
  const resolveEditorCanonicalDeckViewStateSource = extractFunctionSource(
    fileContent,
    'function createEditorCanonicalDeckResolver(doc = getIframeDoc()) {',
    '\n\n    function buildEditorPreviewHtml(doc = getIframeDoc()) {'
  );
  vm.runInContext(resolveEditorCanonicalDeckViewStateSource, context);
}

test('resolveEditorStoredCanonicalBaseline prefers the current metadata canonical deck over the persisted baseline', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const currentMetadataCanonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: [
      { id: 'slide-current', nodes: [] }
    ]
  };
  const persistedCanonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: [
      { id: 'slide-persisted', nodes: [] }
    ]
  };
  const calls = [];
  const context = {
    SlideNextStudioDeckContext: {
      resolveStoredStudioCanonicalDeck(metadata) {
        calls.push(metadata);
        if (metadata === context.currentPresentationMetadata) {
          return currentMetadataCanonicalDeck;
        }
        if (metadata && metadata.canonicalDeck === persistedCanonicalDeck) {
          return persistedCanonicalDeck;
        }
        return null;
      }
    },
    currentPresentationMetadata: {
      id: 'deck-1',
      canonicalDeck: currentMetadataCanonicalDeck
    },
    lastPersistedCanonicalDeck: persistedCanonicalDeck
  };

  vm.createContext(context);
  loadResolveEditorStoredCanonicalDeck(fileContent, context);

  const result = context.resolveEditorStoredCanonicalBaseline();

  assert.equal(result, currentMetadataCanonicalDeck);
  assert.deepEqual(calls, [context.currentPresentationMetadata]);
});

test('resolveEditorStoredCanonicalBaseline delegates precedence to the shared deck context when available', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const currentMetadataCanonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: [
      { id: 'slide-current', nodes: [] }
    ]
  };
  const persistedCanonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: [
      { id: 'slide-persisted', nodes: [] }
    ]
  };
  const calls = [];
  const context = {
    SlideNextStudioDeckContext: {
      resolvePreferredStoredStudioCanonicalDeck(primaryStoredPresentationMetadata, fallbackStoredPresentationMetadata) {
        calls.push([primaryStoredPresentationMetadata, fallbackStoredPresentationMetadata]);
        return currentMetadataCanonicalDeck;
      }
    },
    currentPresentationMetadata: {
      id: 'deck-1',
      canonicalDeck: currentMetadataCanonicalDeck
    },
    lastPersistedCanonicalDeck: persistedCanonicalDeck
  };

  vm.createContext(context);
  loadResolveEditorStoredCanonicalDeck(fileContent, context);

  const result = context.resolveEditorStoredCanonicalBaseline();

  assert.equal(result, currentMetadataCanonicalDeck);
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], context.currentPresentationMetadata);
  assert.deepEqual(
    JSON.parse(JSON.stringify(calls[0][1])),
    { canonicalDeck: persistedCanonicalDeck }
  );
});

test('buildEditorCanonicalDeck always requests a fresh DOM-derived canonical deck for the active editor session', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const buildEditorCanonicalDeckSource = extractFunctionSource(
    fileContent,
    'function buildEditorCanonicalDeck(doc = getIframeDoc()) {',
    '\n\n    function buildEditorDeckSnapshot(doc = getIframeDoc(), options = {}) {'
  );

  const doc = { label: 'iframe-doc' };
  const calls = [];
  const context = {
    SlideNextStudioDeckContext: {
      buildStudioCanonicalDeck(nextDoc, options) {
        calls.push({ nextDoc, options });
        return { kind: 'slidenext.deck', schemaVersion: 1, slides: [] };
      }
    },
    currentPresentationMetadata: { id: 'deck-1' },
    lastPersistedCanonicalDeck: null,
    buildCurrentPresentationMetadataSeed: () => ({ id: 'seed-deck' }),
    currentPresentationUrl: '/presentations/onboarding-presentation/index.html',
    currentTitle: 'Project Onboarding',
    getEditorSlideId() {
      return 'slide-1';
    },
    assignEditorElementId() {
      return 'node-1';
    },
    getIframeDoc() {
      return doc;
    }
  };

  vm.createContext(context);
  vm.runInContext(buildEditorCanonicalDeckSource, context);

  context.buildEditorCanonicalDeck();

  assert.equal(calls.length, 1);
  assert.equal(calls[0].nextDoc, doc);
  assert.equal(calls[0].options.currentPresentationMetadata, context.currentPresentationMetadata);
  assert.equal(calls[0].options.presentationUrl, '/presentations/onboarding-presentation/index.html');
  assert.equal(calls[0].options.presentationTitle, 'Project Onboarding');
  assert.equal(calls[0].options.preferStoredCanonicalDeck, false);
  assert.deepEqual(
    JSON.parse(JSON.stringify(calls[0].options.fallbackStoredPresentationMetadata)),
    { canonicalDeck: null }
  );
  assert.equal(typeof calls[0].options.getSlideId, 'function');
  assert.equal(typeof calls[0].options.getNodeId, 'function');
});

test('buildEditorCanonicalDeck reuses the in-memory persisted canonical baseline when the iframe is unavailable', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const buildEditorCanonicalDeckSource = extractFunctionSource(
    fileContent,
    'function buildEditorCanonicalDeck(doc = getIframeDoc()) {',
    '\n\n    function buildEditorDeckSnapshot(doc = getIframeDoc(), options = {}) {'
  );

  const persistedCanonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: [
      {
        id: 'slide-1',
        nodes: []
      }
    ]
  };
  const context = {
    SlideNextStudioDeckContext: {
      buildStudioCanonicalDeck(nextDoc, options) {
        assert.equal(nextDoc, null);
        assert.deepEqual(
          JSON.parse(JSON.stringify(options.fallbackStoredPresentationMetadata)),
          { canonicalDeck: persistedCanonicalDeck }
        );
        return persistedCanonicalDeck;
      }
    },
    currentPresentationMetadata: null,
    lastPersistedCanonicalDeck: persistedCanonicalDeck,
    buildCurrentPresentationMetadataSeed: () => ({ id: 'seed-deck' }),
    currentPresentationUrl: '/presentations/onboarding-presentation/index.html',
    currentTitle: 'Project Onboarding',
    getEditorSlideId() {
      return 'slide-1';
    },
    assignEditorElementId() {
      return 'node-1';
    },
    getIframeDoc() {
      return null;
    }
  };

  vm.createContext(context);
  vm.runInContext(buildEditorCanonicalDeckSource, context);

  const result = context.buildEditorCanonicalDeck();

  assert.equal(result, persistedCanonicalDeck);
});

test('buildEditorCanonicalDeck falls back to the stored canonical baseline when the live canonical build is malformed', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const buildEditorCanonicalDeckSource = extractFunctionSource(
    fileContent,
    'function buildEditorCanonicalDeck(doc = getIframeDoc()) {',
    '\n\n    function buildEditorDeckSnapshot(doc = getIframeDoc(), options = {}) {'
  );

  const doc = { label: 'iframe-doc' };
  const persistedCanonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: [
      {
        id: 'slide-1',
        nodes: []
      }
    ]
  };
  const context = {
    SlideNextStudioDeckContext: {
      buildStudioCanonicalDeck(nextDoc, options) {
        assert.equal(nextDoc, doc);
        assert.deepEqual(
          JSON.parse(JSON.stringify(options.fallbackStoredPresentationMetadata)),
          { canonicalDeck: persistedCanonicalDeck }
        );
        return persistedCanonicalDeck;
      }
    },
    currentPresentationMetadata: null,
    lastPersistedCanonicalDeck: persistedCanonicalDeck,
    buildCurrentPresentationMetadataSeed: () => ({ id: 'seed-deck' }),
    currentPresentationUrl: '/presentations/onboarding-presentation/index.html',
    currentTitle: 'Project Onboarding',
    getEditorSlideId() {
      return 'slide-1';
    },
    assignEditorElementId() {
      return 'node-1';
    },
    getIframeDoc() {
      return doc;
    }
  };

  vm.createContext(context);
  vm.runInContext(buildEditorCanonicalDeckSource, context);

  const result = context.buildEditorCanonicalDeck();

  assert.equal(result, persistedCanonicalDeck);
});

test('buildEditorCanonicalDeck prefers the current metadata canonical deck over the persisted baseline when the iframe is unavailable', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const buildEditorCanonicalDeckSource = extractFunctionSource(
    fileContent,
    'function buildEditorCanonicalDeck(doc = getIframeDoc()) {',
    '\n\n    function buildEditorDeckSnapshot(doc = getIframeDoc(), options = {}) {'
  );

  const currentMetadataCanonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: [
      {
        id: 'slide-current',
        nodes: []
      }
    ]
  };
  const persistedCanonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: [
      {
        id: 'slide-persisted',
        nodes: []
      }
    ]
  };
  const context = {
    SlideNextStudioDeckContext: {
      buildStudioCanonicalDeck(nextDoc, options) {
        assert.equal(nextDoc, null);
        assert.equal(options.currentPresentationMetadata, context.currentPresentationMetadata);
        assert.deepEqual(
          JSON.parse(JSON.stringify(options.fallbackStoredPresentationMetadata)),
          { canonicalDeck: persistedCanonicalDeck }
        );
        return currentMetadataCanonicalDeck;
      }
    },
    currentPresentationMetadata: {
      id: 'deck-1',
      canonicalDeck: currentMetadataCanonicalDeck
    },
    lastPersistedCanonicalDeck: persistedCanonicalDeck,
    buildCurrentPresentationMetadataSeed: () => ({ id: 'seed-deck' }),
    currentPresentationUrl: '/presentations/onboarding-presentation/index.html',
    currentTitle: 'Project Onboarding',
    getEditorSlideId() {
      return 'slide-1';
    },
    assignEditorElementId() {
      return 'node-1';
    },
    getIframeDoc() {
      return null;
    }
  };

  vm.createContext(context);
  vm.runInContext(buildEditorCanonicalDeckSource, context);

  const result = context.buildEditorCanonicalDeck();

  assert.equal(result, currentMetadataCanonicalDeck);
});

test('resolveEditorFallbackActiveSlideId rebuilds a malformed canonical deck input before choosing the fallback slide', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const resolveEditorFallbackActiveSlideIdSource = extractFunctionSource(
    fileContent,
    'function resolveEditorFallbackActiveSlideId(doc = getIframeDoc(), canonicalDeck = null) {',
    '\n\n    function buildEditorPreviewHtml(doc = getIframeDoc()) {'
  );

  const iframeDoc = { label: 'iframe-doc' };
  const rebuiltCanonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: [
      { id: 'slide-1', nodes: [] },
      { id: 'slide-2', nodes: [] }
    ]
  };
  const malformedCanonicalDeck = {
    slides: 'not-an-array'
  };
  const calls = [];
  const context = {
    SlideNextCanonicalDeck: {
      isCanonicalDeck(deck) {
        calls.push(['isCanonicalDeck', deck]);
        return deck === rebuiltCanonicalDeck;
      }
    },
    buildEditorCanonicalDeck(nextDoc) {
      calls.push(['buildEditorCanonicalDeck', nextDoc]);
      return rebuiltCanonicalDeck;
    },
    currentSlideIndex: 1,
    getIframeDoc() {
      return iframeDoc;
    },
    getPersistedActiveSlideId() {
      calls.push(['getPersistedActiveSlideId']);
      return 'slide-persisted';
    },
    resolveEditorLiveActiveSlideId(nextDoc) {
      calls.push(['resolveEditorLiveActiveSlideId', nextDoc]);
      return '';
    }
  };

  vm.createContext(context);
  vm.runInContext(resolveEditorFallbackActiveSlideIdSource, context);

  const result = context.resolveEditorFallbackActiveSlideId(iframeDoc, malformedCanonicalDeck);

  assert.equal(result, 'slide-2');
  assert.equal(calls[0][0], 'getPersistedActiveSlideId');
  assert.equal(calls[1][0], 'isCanonicalDeck');
  assert.equal(calls[1][1], malformedCanonicalDeck);
  assert.equal(calls[2][0], 'buildEditorCanonicalDeck');
  assert.equal(calls[2][1], iframeDoc);
});

test('resolveEditorFallbackActiveSlideId delegates to the shared deck view helper when available', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const resolveEditorFallbackActiveSlideIdSource = extractFunctionSource(
    fileContent,
    'function resolveEditorFallbackActiveSlideId(doc = getIframeDoc(), canonicalDeck = null) {',
    '\n\n    function buildEditorPreviewHtml(doc = getIframeDoc()) {'
  );

  const iframeDoc = { label: 'iframe-doc' };
  const canonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: [
      { id: 'slide-1', nodes: [] }
    ]
  };
  let delegatedArgs = null;
  const context = {
    SlideNextStudioDeckView: {
      resolveStudioFallbackActiveSlideId(doc, nextCanonicalDeck, options) {
        delegatedArgs = { doc, nextCanonicalDeck, options };
        return 'slide-shared';
      }
    },
    SlideNextCanonicalDeck: {
      isCanonicalDeck(deck) {
        return deck === canonicalDeck;
      }
    },
    buildEditorCanonicalDeck() {
      throw new Error('buildEditorCanonicalDeck should be delegated through options');
    },
    currentSlideIndex: 0,
    getIframeDoc() {
      return iframeDoc;
    },
    getPersistedActiveSlideId() {
      return 'slide-persisted';
    },
    resolveEditorLiveActiveSlideId() {
      return '';
    }
  };

  vm.createContext(context);
  vm.runInContext(resolveEditorFallbackActiveSlideIdSource, context);

  const result = context.resolveEditorFallbackActiveSlideId(iframeDoc, canonicalDeck);

  assert.equal(result, 'slide-shared');
  assert.equal(delegatedArgs.doc, iframeDoc);
  assert.equal(delegatedArgs.nextCanonicalDeck, canonicalDeck);
  assert.equal(delegatedArgs.options.currentSlideIndex, 0);
  assert.equal(delegatedArgs.options.getPersistedActiveSlideId, context.getPersistedActiveSlideId);
  assert.equal(typeof delegatedArgs.options.resolveCanonicalDeck, 'function');
  assert.equal(typeof delegatedArgs.options.resolveLiveActiveSlideId, 'function');
  assert.equal(delegatedArgs.options.isCanonicalDeck, context.SlideNextCanonicalDeck.isCanonicalDeck);
});

test('buildEditorDeckSnapshot prefers the current session active slide fallback when the iframe is unavailable', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const resolveEditorFallbackActiveSlideIdSource = extractFunctionSource(
    fileContent,
    'function resolveEditorFallbackActiveSlideId(doc = getIframeDoc(), canonicalDeck = null) {',
    '\n\n    function buildEditorPreviewHtml(doc = getIframeDoc()) {'
  );
  const getPersistedActiveSlideIdSource = extractFunctionSource(
    fileContent,
    'function getPersistedActiveSlideId(playbackState = persistedDeckPlaybackState) {',
    '\n\n    function buildEditorDeckSnapshot(doc = getIframeDoc(), options = {}) {'
  );
  const buildEditorDeckSnapshotSource = extractFunctionSource(
    fileContent,
    'function buildEditorDeckSnapshot(doc = getIframeDoc(), options = {}) {',
    '\n\n    function getStudioActiveSlideIndex(doc = getIframeDoc()) {'
  );

  const calls = [];
  let buildEditorCanonicalDeckCalls = 0;
  const canonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: [
      { id: 'slide-1', nodes: [] },
      { id: 'slide-2', nodes: [] }
    ]
  };
  const activeSlide = { id: 'slide-2' };
  const iframeDoc = {
    label: 'iframe-doc',
    querySelector(selector) {
      assert.equal(selector, '.slide-active');
      return activeSlide;
    }
  };
  const context = {
    SlideNextStudioDeckSnapshot: {
      buildStudioDeckSnapshot(nextDoc, options) {
        calls.push({
          nextDoc,
          options,
          canonicalDeck: options.buildCanonicalDeck(nextDoc)
        });
        return {
          activeSlideId: options.fallbackActiveSlideId,
          activeSlideIndex: 1,
          slides: []
        };
      }
    },
    buildEditorCanonicalDeck() {
      buildEditorCanonicalDeckCalls += 1;
      return canonicalDeck;
    },
    buildEditorDeckSnapshotFromDom() {},
    buildEditorLayerSnapshot() {},
    currentSlideIndex: 1,
    getEditorSlideId() {
      return 'slide-2';
    },
    getIframeDoc() {
      return iframeDoc;
    },
    getSlideById() {
      return null;
    },
    persistedDeckPlaybackState: {
      activeSlideId: 'slide-1'
    }
  };

  vm.createContext(context);
  vm.runInContext(resolveEditorFallbackActiveSlideIdSource, context);
  vm.runInContext(getPersistedActiveSlideIdSource, context);
  loadResolveEditorCanonicalDeckViewState(fileContent, context);
  vm.runInContext(buildEditorDeckSnapshotSource, context);

  const result = context.buildEditorDeckSnapshot();

  assert.equal(calls.length, 1);
  assert.equal(calls[0].nextDoc, iframeDoc);
  assert.equal(calls[0].canonicalDeck, canonicalDeck);
  assert.equal(calls[0].options.fallbackActiveSlideId, 'slide-2');
  assert.equal(buildEditorCanonicalDeckCalls, 1);
  assert.equal(result.activeSlideId, 'slide-2');
  assert.equal(result.activeSlideIndex, 1);
});

test('buildEditorDeckSnapshot falls back to the current session slide when live active slide state is unavailable', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const resolveEditorFallbackActiveSlideIdSource = extractFunctionSource(
    fileContent,
    'function resolveEditorFallbackActiveSlideId(doc = getIframeDoc(), canonicalDeck = null) {',
    '\n\n    function buildEditorPreviewHtml(doc = getIframeDoc()) {'
  );
  const getPersistedActiveSlideIdSource = extractFunctionSource(
    fileContent,
    'function getPersistedActiveSlideId(playbackState = persistedDeckPlaybackState) {',
    '\n\n    function buildEditorDeckSnapshot(doc = getIframeDoc(), options = {}) {'
  );
  const buildEditorDeckSnapshotSource = extractFunctionSource(
    fileContent,
    'function buildEditorDeckSnapshot(doc = getIframeDoc(), options = {}) {',
    '\n\n    function getStudioActiveSlideIndex(doc = getIframeDoc()) {'
  );

  const calls = [];
  let buildEditorCanonicalDeckCalls = 0;
  const canonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: [
      { id: 'slide-1', nodes: [] },
      { id: 'slide-2', nodes: [] }
    ]
  };
  const iframeDoc = {
    label: 'iframe-doc',
    querySelector(selector) {
      assert.equal(selector, '.slide-active');
      return null;
    }
  };
  const context = {
    SlideNextStudioDeckSnapshot: {
      buildStudioDeckSnapshot(nextDoc, options) {
        calls.push({
          nextDoc,
          options,
          canonicalDeck: options.buildCanonicalDeck(nextDoc)
        });
        return {
          activeSlideId: options.fallbackActiveSlideId,
          activeSlideIndex: 1,
          slides: []
        };
      }
    },
    buildEditorCanonicalDeck(nextDoc) {
      buildEditorCanonicalDeckCalls += 1;
      assert.equal(nextDoc, iframeDoc);
      return canonicalDeck;
    },
    buildEditorDeckSnapshotFromDom() {},
    buildEditorLayerSnapshot() {},
    currentSlideIndex: 1,
    getActiveSlideId(nextDoc) {
      assert.equal(nextDoc, iframeDoc);
      return '';
    },
    getEditorSlideId() {
      return '';
    },
    getIframeDoc() {
      return iframeDoc;
    },
    getSlideById() {
      return null;
    },
    persistedDeckPlaybackState: {
      activeSlideId: 'slide-1'
    }
  };

  vm.createContext(context);
  vm.runInContext(resolveEditorFallbackActiveSlideIdSource, context);
  vm.runInContext(getPersistedActiveSlideIdSource, context);
  loadResolveEditorCanonicalDeckViewState(fileContent, context);
  vm.runInContext(buildEditorDeckSnapshotSource, context);

  const result = context.buildEditorDeckSnapshot();

  assert.equal(calls.length, 1);
  assert.equal(calls[0].nextDoc, iframeDoc);
  assert.equal(calls[0].canonicalDeck, canonicalDeck);
  assert.equal(calls[0].options.fallbackActiveSlideId, 'slide-2');
  assert.equal(buildEditorCanonicalDeckCalls, 1);
  assert.equal(result.activeSlideId, 'slide-2');
  assert.equal(result.activeSlideIndex, 1);
});
