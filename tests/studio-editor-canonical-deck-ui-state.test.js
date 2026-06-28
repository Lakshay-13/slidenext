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
  const calls = [];
  const context = {
    SlideNextStudioDeckContext: {
      resolveStoredStudioCanonicalDeck(metadata) {
        calls.push(['resolveStoredStudioCanonicalDeck', metadata]);
        return metadata && metadata.canonicalDeck === persistedCanonicalDeck
          ? persistedCanonicalDeck
          : null;
      },
      buildStudioCanonicalDeck() {
        throw new Error('metadata canonical resolution should satisfy this fallback without rebuilding');
      }
    },
    currentPresentationMetadata: null,
    lastPersistedCanonicalDeck: persistedCanonicalDeck,
    getIframeDoc() {
      return null;
    }
  };

  vm.createContext(context);
  vm.runInContext(buildEditorCanonicalDeckSource, context);

  const result = context.buildEditorCanonicalDeck();

  assert.equal(result, persistedCanonicalDeck);
  assert.equal(calls.length, 2);
  assert.equal(calls[0][0], 'resolveStoredStudioCanonicalDeck');
  assert.equal(calls[0][1], null);
  assert.equal(calls[1][0], 'resolveStoredStudioCanonicalDeck');
  assert.equal(calls[1][1].canonicalDeck, persistedCanonicalDeck);
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
  const calls = [];
  const context = {
    SlideNextStudioDeckContext: {
      resolveStoredStudioCanonicalDeck(metadata) {
        calls.push(['resolveStoredStudioCanonicalDeck', metadata]);
        if (metadata === context.currentPresentationMetadata) {
          return currentMetadataCanonicalDeck;
        }
        if (metadata && metadata.canonicalDeck === persistedCanonicalDeck) {
          return persistedCanonicalDeck;
        }
        return null;
      },
      buildStudioCanonicalDeck() {
        throw new Error('stored metadata canonical resolution should satisfy this fallback without rebuilding');
      }
    },
    currentPresentationMetadata: {
      id: 'deck-1',
      canonicalDeck: currentMetadataCanonicalDeck
    },
    lastPersistedCanonicalDeck: persistedCanonicalDeck,
    getIframeDoc() {
      return null;
    }
  };

  vm.createContext(context);
  vm.runInContext(buildEditorCanonicalDeckSource, context);

  const result = context.buildEditorCanonicalDeck();

  assert.equal(result, currentMetadataCanonicalDeck);
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], 'resolveStoredStudioCanonicalDeck');
  assert.equal(calls[0][1], context.currentPresentationMetadata);
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
  const context = {
    SlideNextStudioDeckSnapshot: {
      buildStudioDeckSnapshot(nextDoc, options) {
        calls.push({ nextDoc, options });
        return {
          activeSlideId: options.fallbackActiveSlideId,
          activeSlideIndex: 1,
          slides: []
        };
      }
    },
    buildEditorCanonicalDeck() {
      return {
        kind: 'slidenext.deck',
        schemaVersion: 1,
        slides: [
          { id: 'slide-1', nodes: [] },
          { id: 'slide-2', nodes: [] }
        ]
      };
    },
    buildEditorDeckSnapshotFromDom() {},
    buildEditorLayerSnapshot() {},
    currentSlideIndex: 1,
    getActiveSlide() {
      return null;
    },
    getEditorSlideId() {
      return '';
    },
    getIframeDoc() {
      return null;
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
  vm.runInContext(buildEditorDeckSnapshotSource, context);

  const result = context.buildEditorDeckSnapshot();

  assert.equal(calls.length, 1);
  assert.equal(calls[0].nextDoc, null);
  assert.equal(calls[0].options.fallbackActiveSlideId, 'slide-2');
  assert.equal(result.activeSlideId, 'slide-2');
  assert.equal(result.activeSlideIndex, 1);
});
