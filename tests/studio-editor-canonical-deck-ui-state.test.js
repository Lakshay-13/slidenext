const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const canonicalDeckModel = require('../shared/canonical-deck.js');
const presentationMetadata = require('../shared/presentation-metadata.js');

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

test('resolveEditorStoredCanonicalDeck falls back to the shared presentation metadata normalizer when the deck context helper is unavailable', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const rawStoredCanonicalDeck = {
    metadata: {
      title: 'Project Onboarding'
    },
    slides: [
      { id: 'slide-1', nodes: [] }
    ]
  };
  const context = {
    SlideNextStudioDeckContext: {},
    SlideNextPresentationMetadata: presentationMetadata,
    SlideNextCanonicalDeck: canonicalDeckModel
  };

  vm.createContext(context);
  loadResolveEditorStoredCanonicalDeck(fileContent, context);

  const result = context.resolveEditorStoredCanonicalDeck({
    id: 'onboarding-presentation',
    title: 'Project Onboarding',
    sourcePath: '/presentations/onboarding-presentation/index.html',
    canonicalDeck: rawStoredCanonicalDeck
  });

  assert.deepEqual(result, canonicalDeckModel.createCanonicalDeck({
    metadata: {
      id: 'onboarding-presentation',
      title: 'Project Onboarding',
      sourcePath: '/presentations/onboarding-presentation/index.html'
    },
    slides: [
      { id: 'slide-1', nodes: [] }
    ]
  }));
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

test('buildEditorCanonicalDeck falls back to the shared deck loader when the deck context builder is unavailable', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const buildEditorCanonicalDeckSource = extractFunctionSource(
    fileContent,
    'function buildEditorCanonicalDeck(doc = getIframeDoc()) {',
    '\n\n    function buildEditorDeckSnapshot(doc = getIframeDoc(), options = {}) {'
  );

  const doc = { label: 'iframe-doc' };
  const canonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: []
  };
  const currentPresentationMetadata = {
    id: 'deck-1',
    title: 'Project Onboarding',
    sourcePath: '/presentations/onboarding-presentation/index.html'
  };
  const calls = [];
  const context = {
    SlideNextStudioDeckContext: {},
    SlideNextDeckLoader: {
      buildCanonicalDeckFromDocument(nextDoc, options) {
        calls.push({ nextDoc, options });
        return canonicalDeck;
      }
    },
    SlideNextCanonicalDeck: {
      isCanonicalDeck: (deck) => deck === canonicalDeck
    },
    currentPresentationMetadata,
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

  const result = context.buildEditorCanonicalDeck();

  assert.equal(result, canonicalDeck);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].nextDoc, doc);
  assert.equal(calls[0].options.presentationMetadata, currentPresentationMetadata);
  assert.equal(calls[0].options.sourcePath, '/presentations/onboarding-presentation/index.html');
  assert.equal(typeof calls[0].options.getSlideId, 'function');
  assert.equal(typeof calls[0].options.getNodeId, 'function');
});

test('buildEditorCanonicalDeck reuses the local stored canonical resolver when the deck context builder is unavailable', () => {
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
    SlideNextStudioDeckContext: {},
    currentPresentationMetadata: {
      id: 'deck-1',
      canonicalDeck: currentMetadataCanonicalDeck
    },
    lastPersistedCanonicalDeck: persistedCanonicalDeck,
    currentPresentationUrl: '/presentations/onboarding-presentation/index.html',
    currentTitle: 'Project Onboarding',
    resolveEditorStoredCanonicalDeck(metadata) {
      calls.push(metadata);
      if (metadata === context.currentPresentationMetadata) {
        return currentMetadataCanonicalDeck;
      }
      if (metadata && metadata.canonicalDeck === persistedCanonicalDeck) {
        return persistedCanonicalDeck;
      }
      return null;
    },
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
  assert.deepEqual(calls, [context.currentPresentationMetadata]);
});

test('buildEditorCanonicalDeck prefers the local stored canonical baseline helper when the deck context builder is unavailable', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const buildEditorCanonicalDeckSource = extractFunctionSource(
    fileContent,
    'function buildEditorCanonicalDeck(doc = getIframeDoc()) {',
    '\n\n    function buildEditorDeckSnapshot(doc = getIframeDoc(), options = {}) {'
  );

  const storedCanonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: [
      {
        id: 'slide-current',
        nodes: []
      }
    ]
  };
  const calls = [];
  const context = {
    SlideNextStudioDeckContext: {},
    currentPresentationMetadata: {
      id: 'deck-1'
    },
    lastPersistedCanonicalDeck: {
      kind: 'slidenext.deck',
      schemaVersion: 1,
      slides: [
        {
          id: 'slide-persisted',
          nodes: []
        }
      ]
    },
    currentPresentationUrl: '/presentations/onboarding-presentation/index.html',
    currentTitle: 'Project Onboarding',
    resolveEditorStoredCanonicalBaseline(options = {}) {
      calls.push(options);
      return storedCanonicalDeck;
    },
    resolveEditorStoredCanonicalDeck() {
      throw new Error('resolveEditorStoredCanonicalDeck should not run when the baseline helper is available');
    },
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

  assert.equal(result, storedCanonicalDeck);
  assert.deepEqual(JSON.parse(JSON.stringify(calls)), [{
    currentPresentationMetadata: { id: 'deck-1' },
    persistedCanonicalDeck: {
      kind: 'slidenext.deck',
      schemaVersion: 1,
      slides: [
        {
          id: 'slide-persisted',
          nodes: []
        }
      ]
    }
  }]);
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

test('resolveEditorCanonicalDeckOverride delegates canonical override resolution through the shared editor persistence helper when available', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const helperSource = extractFunctionSource(
    fileContent,
    'function buildEditorCanonicalDeck(doc = getIframeDoc()) {',
    '\n\n    function getPersistedActiveSlideId(playbackState = persistedDeckPlaybackState) {'
  );

  const iframeDoc = { label: 'iframe-doc' };
  const canonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: []
  };
  let delegatedArgs = null;
  const context = {
    SlideNextCanonicalDeck: {
      isCanonicalDeck(deck) {
        return deck === canonicalDeck;
      }
    },
    SlideNextStudioDeckContext: {
      buildStudioCanonicalDeck() {
        return canonicalDeck;
      }
    },
    SlideNextStudioEditorPersistence: {
      resolveStudioCanonicalDeckOverride(options) {
        delegatedArgs = {
          canonicalDeck: options.canonicalDeck,
          buildCanonicalDeck: options.buildCanonicalDeck,
          isCanonicalDeck: options.isCanonicalDeck
        };
        return options.buildCanonicalDeck();
      }
    },
    buildCurrentPresentationMetadataSeed: () => ({ id: 'seed-deck' }),
    currentPresentationMetadata: null,
    currentPresentationUrl: '/presentations/onboarding-presentation/index.html',
    currentTitle: 'Project Onboarding',
    assignEditorElementId() {
      return 'node-1';
    },
    getEditorSlideId() {
      return 'slide-1';
    },
    getIframeDoc() {
      return iframeDoc;
    },
    lastPersistedCanonicalDeck: null
  };

  vm.createContext(context);
  vm.runInContext(helperSource, context);

  const result = context.resolveEditorCanonicalDeckOverride(null, {
    buildCanonicalDeck: () => context.buildEditorCanonicalDeck(iframeDoc)
  });

  assert.equal(result, canonicalDeck);
  assert.equal(delegatedArgs.canonicalDeck, null);
  assert.equal(typeof delegatedArgs.buildCanonicalDeck, 'function');
  assert.equal(delegatedArgs.isCanonicalDeck, context.SlideNextCanonicalDeck.isCanonicalDeck);
});

test('resolveEditorDeckCanonicalOverride delegates deck-view canonical override resolution through resolveEditorCanonicalDeckOverride when available', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const helperSource = extractFunctionSource(
    fileContent,
    'function resolveEditorDeckCanonicalOverride(doc = getIframeDoc(), canonicalDeck = null) {',
    '\n\n    function resolveEditorSaveCanonicalDeck(doc = getIframeDoc(), canonicalDeck = null) {'
  );

  const iframeDoc = { label: 'iframe-doc' };
  const canonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: []
  };
  let delegatedArgs = null;
  const context = {
    resolveEditorCanonicalDeckOverride(nextCanonicalDeck, options = {}) {
      delegatedArgs = {
        canonicalDeck: nextCanonicalDeck,
        buildCanonicalDeck: options.buildCanonicalDeck
      };
      return canonicalDeck;
    },
    buildEditorCanonicalDeck(nextDoc) {
      assert.equal(nextDoc, iframeDoc);
      return {
        kind: 'slidenext.deck',
        schemaVersion: 1,
        slides: [{ id: 'slide-fallback', nodes: [] }]
      };
    },
    getIframeDoc() {
      return iframeDoc;
    }
  };

  vm.createContext(context);
  vm.runInContext(helperSource, context);

  assert.equal(context.resolveEditorDeckCanonicalOverride(iframeDoc, canonicalDeck), canonicalDeck);
  assert.equal(delegatedArgs.canonicalDeck, canonicalDeck);
  assert.equal(typeof delegatedArgs.buildCanonicalDeck, 'function');
});

test('resolveEditorDeckCanonicalOverride reuses the provided canonical deck when the shared override helper is unavailable', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const helperSource = extractFunctionSource(
    fileContent,
    'function resolveEditorDeckCanonicalOverride(doc = getIframeDoc(), canonicalDeck = null) {',
    '\n\n    function resolveEditorSaveCanonicalDeck(doc = getIframeDoc(), canonicalDeck = null) {'
  );

  const iframeDoc = { label: 'iframe-doc' };
  const canonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: []
  };
  let buildEditorCanonicalDeckCalls = 0;
  const context = {
    buildEditorCanonicalDeck() {
      buildEditorCanonicalDeckCalls += 1;
      return {
        kind: 'slidenext.deck',
        schemaVersion: 1,
        slides: [{ id: 'slide-fallback', nodes: [] }]
      };
    },
    getIframeDoc() {
      return iframeDoc;
    }
  };

  vm.createContext(context);
  vm.runInContext(helperSource, context);

  assert.equal(context.resolveEditorDeckCanonicalOverride(iframeDoc, canonicalDeck), canonicalDeck);
  assert.equal(buildEditorCanonicalDeckCalls, 0);
});

test('resolveEditorSaveCanonicalDeck delegates save canonical resolution through resolveEditorCanonicalDeckOverride when available', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const helperSource = extractFunctionSource(
    fileContent,
    'function resolveEditorCanonicalDeckOverride(canonicalDeck = null, options = {}) {',
    '\n\n    function getPersistedActiveSlideId(playbackState = persistedDeckPlaybackState) {'
  );

  const iframeDoc = { label: 'iframe-doc' };
  const canonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: []
  };
  let delegatedArgs = null;
  const context = {
    SlideNextCanonicalDeck: {
      isCanonicalDeck(deck) {
        return deck === canonicalDeck;
      }
    },
    SlideNextStudioEditorPersistence: {
      resolveStudioCanonicalDeckOverride(options) {
        delegatedArgs = {
          canonicalDeck: options.canonicalDeck,
          buildCanonicalDeck: options.buildCanonicalDeck,
          isCanonicalDeck: options.isCanonicalDeck
        };
        return options.buildCanonicalDeck();
      }
    },
    buildEditorCanonicalDeck(nextDoc) {
      assert.equal(nextDoc, iframeDoc);
      return canonicalDeck;
    },
    getIframeDoc() {
      return iframeDoc;
    }
  };

  vm.createContext(context);
  vm.runInContext(helperSource, context);

  const result = context.resolveEditorSaveCanonicalDeck(iframeDoc, null);

  assert.equal(result, canonicalDeck);
  assert.equal(delegatedArgs.canonicalDeck, null);
  assert.equal(typeof delegatedArgs.buildCanonicalDeck, 'function');
  assert.equal(delegatedArgs.isCanonicalDeck, context.SlideNextCanonicalDeck.isCanonicalDeck);
});

test('resolveEditorSaveCanonicalDeck reuses a valid provided canonical deck when the override helper is unavailable', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const helperSource = extractFunctionSource(
    fileContent,
    'function resolveEditorSaveCanonicalDeck(doc = getIframeDoc(), canonicalDeck = null) {',
    '\n\n    function getPersistedActiveSlideId(playbackState = persistedDeckPlaybackState) {'
  );

  const iframeDoc = { label: 'iframe-doc' };
  const canonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: []
  };
  let buildEditorCanonicalDeckCalls = 0;
  const context = {
    SlideNextCanonicalDeck: {
      isCanonicalDeck(deck) {
        return deck === canonicalDeck;
      }
    },
    buildEditorCanonicalDeck(nextDoc) {
      buildEditorCanonicalDeckCalls += 1;
      assert.equal(nextDoc, iframeDoc);
      return {
        kind: 'slidenext.deck',
        schemaVersion: 1,
        slides: [{ id: 'slide-fallback', nodes: [] }]
      };
    },
    getIframeDoc() {
      return iframeDoc;
    }
  };

  vm.createContext(context);
  vm.runInContext(helperSource, context);

  assert.equal(context.resolveEditorSaveCanonicalDeck(iframeDoc, canonicalDeck), canonicalDeck);
  assert.equal(buildEditorCanonicalDeckCalls, 0);
});

test('resolveEditorCapturedCanonicalDeck delegates capture canonical resolution through resolveEditorCanonicalDeckOverride when available', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const helperSource = extractFunctionSource(
    fileContent,
    'function resolveEditorCapturedCanonicalDeck(doc = getIframeDoc(), canonicalDeck = null) {',
    '\n\n    function getPersistedActiveSlideId(playbackState = persistedDeckPlaybackState) {'
  );

  const iframeDoc = { label: 'iframe-doc' };
  const canonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: []
  };
  let delegatedArgs = null;
  const context = {
    resolveEditorCanonicalDeckOverride(nextCanonicalDeck, options = {}) {
      delegatedArgs = {
        canonicalDeck: nextCanonicalDeck,
        buildCanonicalDeck: options.buildCanonicalDeck
      };
      return canonicalDeck;
    },
    buildEditorCanonicalDeck(nextDoc) {
      assert.equal(nextDoc, iframeDoc);
      return {
        kind: 'slidenext.deck',
        schemaVersion: 1,
        slides: [{ id: 'slide-fallback', nodes: [] }]
      };
    },
    getIframeDoc() {
      return iframeDoc;
    }
  };

  vm.createContext(context);
  vm.runInContext(helperSource, context);

  assert.equal(context.resolveEditorCapturedCanonicalDeck(iframeDoc, canonicalDeck), canonicalDeck);
  assert.equal(delegatedArgs.canonicalDeck, canonicalDeck);
  assert.equal(typeof delegatedArgs.buildCanonicalDeck, 'function');
});

test('resolveEditorCapturedCanonicalDeck falls back to the live editor canonical deck when the override helper is unavailable', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const helperSource = extractFunctionSource(
    fileContent,
    'function resolveEditorCapturedCanonicalDeck(doc = getIframeDoc(), canonicalDeck = null) {',
    '\n\n    function getPersistedActiveSlideId(playbackState = persistedDeckPlaybackState) {'
  );

  const iframeDoc = { label: 'iframe-doc' };
  const canonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: []
  };
  let buildEditorCanonicalDeckCalls = 0;
  const context = {
    buildEditorCanonicalDeck(nextDoc) {
      buildEditorCanonicalDeckCalls += 1;
      assert.equal(nextDoc, iframeDoc);
      return canonicalDeck;
    },
    getIframeDoc() {
      return iframeDoc;
    }
  };

  vm.createContext(context);
  vm.runInContext(helperSource, context);

  assert.equal(context.resolveEditorCapturedCanonicalDeck(iframeDoc, null), canonicalDeck);
  assert.equal(buildEditorCanonicalDeckCalls, 1);
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
  assert.equal(typeof delegatedArgs.options.resolveCanonicalDeckOverride, 'function');
  assert.equal(typeof delegatedArgs.options.resolveLiveActiveSlideId, 'function');
  assert.equal(delegatedArgs.options.isCanonicalDeck, context.SlideNextCanonicalDeck.isCanonicalDeck);
});

test('resolveEditorFallbackActiveSlideId forwards canonical override resolution into the shared deck view helper path', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const resolveEditorCanonicalDeckOverrideSource = extractFunctionSource(
    fileContent,
    'function resolveEditorCanonicalDeckOverride(canonicalDeck = null, options = {}) {',
    '\n\n    function getPersistedActiveSlideId(playbackState = persistedDeckPlaybackState) {'
  );
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
    metadata: {
      title: 'Broken Deck'
    }
  };
  let delegatedArgs = null;
  const calls = [];
  const context = {
    SlideNextCanonicalDeck: {
      isCanonicalDeck(deck) {
        calls.push(['isCanonicalDeck', deck]);
        return deck === rebuiltCanonicalDeck;
      }
    },
    SlideNextStudioDeckView: {
      resolveStudioFallbackActiveSlideId(doc, nextCanonicalDeck, options) {
        delegatedArgs = { doc, nextCanonicalDeck, options };
        return options.resolveCanonicalDeckOverride(nextCanonicalDeck, doc);
      }
    },
    SlideNextStudioEditorPersistence: {
      resolveStudioCanonicalDeckOverride(options) {
        calls.push(['resolveStudioCanonicalDeckOverride', options.canonicalDeck]);
        return options.buildCanonicalDeck();
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
      return 'slide-persisted';
    },
    resolveEditorLiveActiveSlideId() {
      return '';
    }
  };

  vm.createContext(context);
  vm.runInContext(resolveEditorCanonicalDeckOverrideSource, context);
  vm.runInContext(resolveEditorFallbackActiveSlideIdSource, context);

  const result = context.resolveEditorFallbackActiveSlideId(iframeDoc, malformedCanonicalDeck);

  assert.equal(result, rebuiltCanonicalDeck);
  assert.equal(delegatedArgs.doc, iframeDoc);
  assert.equal(delegatedArgs.nextCanonicalDeck, malformedCanonicalDeck);
  assert.equal(typeof delegatedArgs.options.resolveCanonicalDeckOverride, 'function');
  assert.deepEqual(calls, [
    ['resolveStudioCanonicalDeckOverride', malformedCanonicalDeck],
    ['buildEditorCanonicalDeck', iframeDoc]
  ]);
});

test('resolveEditorFallbackActiveSlideId reuses the local deck canonical override helper in the shared deck view path when available', () => {
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
    slides: []
  };
  let delegatedArgs = null;
  const calls = [];
  const context = {
    SlideNextStudioDeckView: {
      resolveStudioFallbackActiveSlideId(doc, nextCanonicalDeck, options) {
        delegatedArgs = { doc, nextCanonicalDeck, options };
        return options.resolveCanonicalDeckOverride(nextCanonicalDeck, doc);
      }
    },
    currentSlideIndex: 0,
    getIframeDoc() {
      return iframeDoc;
    },
    getPersistedActiveSlideId() {
      return 'slide-persisted';
    },
    resolveEditorDeckCanonicalOverride(nextDoc, nextCanonicalDeck) {
      calls.push(['resolveEditorDeckCanonicalOverride', nextDoc, nextCanonicalDeck]);
      return canonicalDeck;
    },
    resolveEditorLiveActiveSlideId() {
      return '';
    }
  };

  vm.createContext(context);
  vm.runInContext(resolveEditorFallbackActiveSlideIdSource, context);

  const result = context.resolveEditorFallbackActiveSlideId(iframeDoc, canonicalDeck);

  assert.equal(result, canonicalDeck);
  assert.equal(delegatedArgs.doc, iframeDoc);
  assert.equal(delegatedArgs.nextCanonicalDeck, canonicalDeck);
  assert.equal(typeof delegatedArgs.options.resolveCanonicalDeckOverride, 'function');
  assert.deepEqual(calls, [
    ['resolveEditorDeckCanonicalOverride', iframeDoc, canonicalDeck]
  ]);
});

test('resolveEditorFallbackActiveSlideId delegates canonical override resolution to the shared editor persistence helper when available', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const resolveEditorCanonicalDeckOverrideSource = extractFunctionSource(
    fileContent,
    'function resolveEditorCanonicalDeckOverride(canonicalDeck = null, options = {}) {',
    '\n\n    function getPersistedActiveSlideId(playbackState = persistedDeckPlaybackState) {'
  );
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
    metadata: {
      title: 'Broken Deck'
    }
  };
  let delegatedArgs = null;
  const calls = [];
  const context = {
    SlideNextCanonicalDeck: {
      isCanonicalDeck(deck) {
        calls.push(['isCanonicalDeck', deck]);
        return deck === rebuiltCanonicalDeck;
      }
    },
    SlideNextStudioEditorPersistence: {
      resolveStudioCanonicalDeckOverride(options) {
        delegatedArgs = {
          canonicalDeck: options.canonicalDeck,
          buildCanonicalDeck: options.buildCanonicalDeck,
          isCanonicalDeck: options.isCanonicalDeck
        };
        return options.buildCanonicalDeck();
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
  vm.runInContext(resolveEditorCanonicalDeckOverrideSource, context);
  vm.runInContext(resolveEditorFallbackActiveSlideIdSource, context);

  const result = context.resolveEditorFallbackActiveSlideId(iframeDoc, malformedCanonicalDeck);

  assert.equal(result, 'slide-2');
  assert.equal(delegatedArgs.canonicalDeck, malformedCanonicalDeck);
  assert.equal(typeof delegatedArgs.buildCanonicalDeck, 'function');
  assert.equal(delegatedArgs.isCanonicalDeck, context.SlideNextCanonicalDeck.isCanonicalDeck);
  assert.equal(calls[0][0], 'getPersistedActiveSlideId');
  assert.equal(calls[1][0], 'buildEditorCanonicalDeck');
  assert.equal(calls[1][1], iframeDoc);
});

test('resolveEditorLiveActiveSlideId delegates to the shared deck view helper when available', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const resolveEditorLiveActiveSlideIdSource = extractFunctionSource(
    fileContent,
    'function resolveEditorLiveActiveSlide(doc = getIframeDoc()) {',
    '\n\n    function buildEditorDeckRenderOptions(doc = getIframeDoc(), canonicalDeck = null, options = {}) {'
  );

  const iframeDoc = { label: 'iframe-doc' };
  let delegatedArgs = null;
  const context = {
    SlideNextStudioDeckView: {
      resolveStudioLiveActiveSlideId(doc, options) {
        delegatedArgs = { doc, options };
        return 'slide-shared';
      }
    },
    getActiveSlideId(nextDoc) {
      return nextDoc === iframeDoc ? 'slide-live' : '';
    },
    getIframeDoc() {
      return iframeDoc;
    }
  };

  vm.createContext(context);
  vm.runInContext(resolveEditorLiveActiveSlideIdSource, context);

  const result = context.resolveEditorLiveActiveSlideId(iframeDoc);

  assert.equal(result, 'slide-shared');
  assert.equal(delegatedArgs.doc, iframeDoc);
  assert.equal(typeof delegatedArgs.options.querySelector, 'function');
  assert.equal(typeof delegatedArgs.options.getActiveSlideId, 'function');
  assert.deepEqual(
    delegatedArgs.options.querySelector({
      querySelector(selector) {
        assert.equal(selector, '.slide-active');
        return { label: 'slide-active' };
      }
    }, '.slide-active'),
    { label: 'slide-active' }
  );
  assert.equal(delegatedArgs.options.querySelector(null, '.slide-active'), null);
  assert.equal(delegatedArgs.options.getActiveSlideId(iframeDoc), 'slide-live');
});

test('resolveEditorLiveActiveSlide prefers the shared editor DOM active slide helper when available', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const resolveEditorLiveActiveSlideSource = extractFunctionSource(
    fileContent,
    'function resolveEditorLiveActiveSlide(doc = getIframeDoc()) {',
    '\n\n    function buildEditorDeckRenderOptions(doc = getIframeDoc(), canonicalDeck = null, options = {}) {'
  );

  const iframeDoc = {
    label: 'iframe-doc',
    querySelector() {
      throw new Error('querySelector should not run when getActiveSlide is available');
    }
  };
  const activeSlide = { id: 'slide-active-el' };
  const context = {
    getActiveSlide(nextDoc) {
      assert.equal(nextDoc, iframeDoc);
      return activeSlide;
    },
    getIframeDoc() {
      return iframeDoc;
    }
  };

  vm.createContext(context);
  vm.runInContext(resolveEditorLiveActiveSlideSource, context);

  assert.equal(context.resolveEditorLiveActiveSlide(iframeDoc), activeSlide);
});

test('getPersistedActiveSlideId delegates to the shared deck persistence helper when available', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const getPersistedActiveSlideIdSource = extractFunctionSource(
    fileContent,
    'function getPersistedActiveSlideId(playbackState = persistedDeckPlaybackState) {',
    '\n\n    function getCurrentEditorPersistedDeckState() {'
  );

  let delegatedPlaybackState = null;
  const context = {
    SlideNextDeckPersistence: {
      resolvePersistedDeckActiveSlideId(playbackState) {
        delegatedPlaybackState = playbackState;
        return 'slide-shared';
      }
    },
    persistedDeckPlaybackState: {
      activeSlideIds: ['slide-2'],
      slideCounterText: '2 / 4'
    }
  };

  vm.createContext(context);
  vm.runInContext(getPersistedActiveSlideIdSource, context);

  const result = context.getPersistedActiveSlideId();

  assert.equal(result, 'slide-shared');
  assert.equal(delegatedPlaybackState, context.persistedDeckPlaybackState);
});

test('resolveEditorCanonicalDeckViewState delegates resolver orchestration to the shared deck view helper when available', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const resolveEditorCanonicalDeckViewStateSource = extractFunctionSource(
    fileContent,
    'function createEditorCanonicalDeckResolver(doc = getIframeDoc()) {',
    '\n\n    function buildEditorPreviewHtml(doc = getIframeDoc()) {'
  );

  const iframeDoc = { label: 'iframe-doc' };
  let delegatedArgs = null;
  let buildEditorCanonicalDeckCalls = 0;
  const context = {
    SlideNextStudioDeckView: {
      resolveStudioCanonicalDeckViewState(doc, options) {
        delegatedArgs = { doc, options };
        return {
          buildCanonicalDeck: options.buildCanonicalDeck,
          liveActiveSlideId: 'slide-live',
          resolvedCanonicalDeck: null
        };
      }
    },
    buildEditorCanonicalDeck(nextDoc) {
      buildEditorCanonicalDeckCalls += 1;
      assert.equal(nextDoc, iframeDoc);
      return { kind: 'slidenext.deck', schemaVersion: 1, slides: [] };
    },
    getIframeDoc() {
      return iframeDoc;
    },
    resolveEditorLiveActiveSlideId() {
      return '';
    }
  };

  vm.createContext(context);
  vm.runInContext(resolveEditorCanonicalDeckViewStateSource, context);

  const result = context.resolveEditorCanonicalDeckViewState(iframeDoc);

  assert.equal(result.liveActiveSlideId, 'slide-live');
  assert.equal(result.resolvedCanonicalDeck, null);
  assert.equal(delegatedArgs.doc, iframeDoc);
  assert.equal(typeof delegatedArgs.options.buildCanonicalDeck, 'function');
  assert.equal(typeof delegatedArgs.options.resolveLiveActiveSlideId, 'function');
  assert.deepEqual(delegatedArgs.options.buildCanonicalDeck(iframeDoc), {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: []
  });
  assert.equal(buildEditorCanonicalDeckCalls, 1);
});

test('createEditorCanonicalDeckResolver delegates fallback resolver creation to the shared snapshot helper when deck view helper is unavailable', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const createEditorCanonicalDeckResolverSource = extractFunctionSource(
    fileContent,
    'function createEditorCanonicalDeckResolver(doc = getIframeDoc()) {',
    '\n\n    function resolveEditorCanonicalDeckViewState(doc = getIframeDoc(), options = {}) {'
  );

  const iframeDoc = { label: 'iframe-doc' };
  let delegatedArgs = null;
  const canonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: []
  };
  const context = {
    SlideNextStudioDeckSnapshot: {
      createStudioDeckSnapshotCanonicalDeckResolver(doc, options) {
        delegatedArgs = { doc, options };
        return function resolveCanonicalDeck(nextDoc = doc) {
          return options.buildCanonicalDeck(nextDoc);
        };
      }
    },
    buildEditorCanonicalDeck(nextDoc) {
      assert.equal(nextDoc, iframeDoc);
      return canonicalDeck;
    },
    getIframeDoc() {
      return iframeDoc;
    }
  };

  vm.createContext(context);
  vm.runInContext(createEditorCanonicalDeckResolverSource, context);

  const resolveCanonicalDeck = context.createEditorCanonicalDeckResolver(iframeDoc);

  assert.equal(delegatedArgs.doc, iframeDoc);
  assert.equal(typeof delegatedArgs.options.buildCanonicalDeck, 'function');
  assert.equal(resolveCanonicalDeck(iframeDoc), canonicalDeck);
});

test('createEditorDeckViewBuildOptions delegates build-option composition to the shared deck view helper when available', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const resolveEditorCanonicalDeckViewStateSource = extractFunctionSource(
    fileContent,
    'function createEditorCanonicalDeckResolver(doc = getIframeDoc()) {',
    '\n\n    function buildEditorPreviewHtml(doc = getIframeDoc()) {'
  );

  const iframeDoc = { label: 'iframe-doc' };
  let delegatedArgs = null;
  const canonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: []
  };
  const context = {
    SlideNextStudioDeckView: {
      createStudioDeckViewBuildOptions(doc, options) {
        delegatedArgs = { doc, options };
        return {
          buildCanonicalDeck: () => canonicalDeck,
          buildFallbackHtml: () => '<html>fallback</html>',
          deckHtmlOptions: {
            renderOptions: {
              activeSlideId: 'slide-live'
            }
          }
        };
      }
    },
    buildEditorCanonicalDeck() {
      return canonicalDeck;
    },
    buildPersistableDeckHtml(nextDoc, options = {}) {
      return JSON.stringify({ nextDoc, canonicalDeck: options.canonicalDeck });
    },
    getIframeDoc() {
      return iframeDoc;
    },
    resolveEditorLiveActiveSlideId() {
      return 'slide-live';
    }
  };

  vm.createContext(context);
  vm.runInContext(resolveEditorCanonicalDeckViewStateSource, context);

  const result = context.createEditorDeckViewBuildOptions(iframeDoc);

  assert.equal(result.buildCanonicalDeck(), canonicalDeck);
  assert.equal(result.buildFallbackHtml(), '<html>fallback</html>');
  assert.equal(result.deckHtmlOptions.renderOptions.activeSlideId, 'slide-live');
  assert.equal(delegatedArgs.doc, iframeDoc);
  assert.equal(typeof delegatedArgs.options.buildCanonicalDeck, 'function');
  assert.equal(typeof delegatedArgs.options.resolveLiveActiveSlideId, 'function');
  assert.equal(typeof delegatedArgs.options.buildFallbackHtml, 'function');
  assert.equal(typeof delegatedArgs.options.buildRenderOptions, 'function');
  assert.equal(delegatedArgs.options.resolveLiveActiveSlideId(iframeDoc), 'slide-live');
  assert.equal(delegatedArgs.options.buildCanonicalDeck(iframeDoc), canonicalDeck);
});

test('createEditorDeckViewBuildOptions forwards custom build overrides to the shared deck view helper', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const resolveEditorCanonicalDeckViewStateSource = extractFunctionSource(
    fileContent,
    'function createEditorCanonicalDeckResolver(doc = getIframeDoc()) {',
    '\n\n    function buildEditorPreviewHtml(doc = getIframeDoc()) {'
  );

  const iframeDoc = { label: 'iframe-doc' };
  const canonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: []
  };
  let delegatedArgs = null;
  const context = {
    SlideNextStudioDeckView: {
      createStudioDeckViewBuildOptions(doc, options) {
        delegatedArgs = { doc, options };
        return {
          buildCanonicalDeck: () => options.buildCanonicalDeck(doc),
          buildFallbackHtml: () => options.buildFallbackHtml(doc, canonicalDeck),
          deckHtmlOptions: {
            renderOptions: options.buildRenderOptions(doc, canonicalDeck, {
              activeSlideId: options.activeSlideId || 'slide-explicit'
            })
          }
        };
      }
    },
    buildEditorCanonicalDeck() {
      throw new Error('default canonical deck builder should not run');
    },
    buildPersistableDeckHtml() {
      throw new Error('default persisted html fallback should not run');
    },
    buildEditorDeckRenderOptions() {
      throw new Error('default render option builder should not run');
    },
    getIframeDoc() {
      return iframeDoc;
    },
    resolveEditorLiveActiveSlideId() {
      throw new Error('default active slide resolver should not run');
    }
  };

  const customBuildCanonicalDeck = () => canonicalDeck;
  const customResolveLiveActiveSlideId = () => 'slide-custom';
  const customBuildFallbackHtml = () => '<html>override-fallback</html>';
  const customBuildRenderOptions = (nextDoc, nextCanonicalDeck, options = {}) => ({
    activeSlideId: options.activeSlideId || 'slide-custom'
  });

  vm.createContext(context);
  vm.runInContext(resolveEditorCanonicalDeckViewStateSource, context);

  const result = context.createEditorDeckViewBuildOptions(iframeDoc, {
    activeSlideId: 'slide-override',
    buildCanonicalDeck: customBuildCanonicalDeck,
    resolveLiveActiveSlideId: customResolveLiveActiveSlideId,
    buildFallbackHtml: customBuildFallbackHtml,
    buildRenderOptions: customBuildRenderOptions
  });

  assert.equal(result.buildCanonicalDeck(), canonicalDeck);
  assert.equal(result.buildFallbackHtml(), '<html>override-fallback</html>');
  assert.deepEqual(
    JSON.parse(JSON.stringify(result.deckHtmlOptions.renderOptions)),
    { activeSlideId: 'slide-override' }
  );
  assert.equal(delegatedArgs.doc, iframeDoc);
  assert.equal(delegatedArgs.options.activeSlideId, 'slide-override');
  assert.equal(delegatedArgs.options.buildCanonicalDeck(iframeDoc), canonicalDeck);
  assert.equal(delegatedArgs.options.resolveLiveActiveSlideId(iframeDoc), 'slide-custom');
  assert.equal(
    delegatedArgs.options.buildFallbackHtml(iframeDoc, canonicalDeck),
    '<html>override-fallback</html>'
  );
  assert.deepEqual(
    JSON.parse(JSON.stringify(
      delegatedArgs.options.buildRenderOptions(iframeDoc, canonicalDeck, {
        activeSlideId: delegatedArgs.options.activeSlideId
      })
    )),
    { activeSlideId: 'slide-override' }
  );
});

test('buildEditorDeckRenderOptions delegates render-option composition to the shared deck view helper when available', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const buildEditorDeckRenderOptionsSource = extractFunctionSource(
    fileContent,
    'function buildEditorDeckRenderOptions(doc = getIframeDoc(), canonicalDeck = null, options = {}) {',
    '\n\n    function createEditorCanonicalDeckResolver(doc = getIframeDoc()) {'
  );

  const iframeDoc = { label: 'iframe-doc' };
  const canonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: []
  };
  let delegatedArgs = null;
  const context = {
    SlideNextCanonicalDeck: {
      isCanonicalDeck(deck) {
        return deck === canonicalDeck;
      }
    },
    SlideNextStudioDeckView: {
      createStudioDeckRenderOptions(doc, nextCanonicalDeck, options) {
        delegatedArgs = { doc, nextCanonicalDeck, options };
        return {
          activeSlideId: 'slide-shared',
          preferSourceHtml: false,
          preferHeadSourceHtml: false,
          preferBodySourceHtml: false,
          preferSlideSourceHtml: false,
          preferNodeSourceHtml: false
        };
      }
    },
    currentSlideIndex: 0,
    getIframeDoc() {
      return iframeDoc;
    },
    getPersistedActiveSlideId() {
      return 'slide-persisted';
    },
    buildEditorCanonicalDeck(nextDoc) {
      return nextDoc === iframeDoc ? canonicalDeck : null;
    },
    resolveEditorCanonicalDeckOverride(nextCanonicalDeck) {
      return nextCanonicalDeck;
    },
    resolveEditorLiveActiveSlideId(nextDoc) {
      return `${nextDoc.label}:${canonicalDeck.kind}`;
    }
  };

  vm.createContext(context);
  vm.runInContext(buildEditorDeckRenderOptionsSource, context);

  const result = context.buildEditorDeckRenderOptions(iframeDoc, canonicalDeck, {
    activeSlideId: 'slide-explicit'
  });

  assert.deepEqual(result, {
    activeSlideId: 'slide-shared',
    preferSourceHtml: false,
    preferHeadSourceHtml: false,
    preferBodySourceHtml: false,
    preferSlideSourceHtml: false,
    preferNodeSourceHtml: false
  });
  assert.equal(delegatedArgs.doc, iframeDoc);
  assert.equal(delegatedArgs.nextCanonicalDeck, canonicalDeck);
  assert.equal(delegatedArgs.options.activeSlideId, 'slide-explicit');
  assert.equal(delegatedArgs.options.currentSlideIndex, 0);
  assert.equal(delegatedArgs.options.getPersistedActiveSlideId, context.getPersistedActiveSlideId);
  assert.equal(typeof delegatedArgs.options.resolveCanonicalDeck, 'function');
  assert.equal(typeof delegatedArgs.options.resolveCanonicalDeckOverride, 'function');
  assert.equal(typeof delegatedArgs.options.resolveLiveActiveSlideId, 'function');
  assert.equal(delegatedArgs.options.isCanonicalDeck, context.SlideNextCanonicalDeck.isCanonicalDeck);
  assert.equal(delegatedArgs.options.resolveCanonicalDeck(iframeDoc), canonicalDeck);
  assert.equal(delegatedArgs.options.resolveCanonicalDeckOverride(canonicalDeck, iframeDoc), canonicalDeck);
  assert.equal(delegatedArgs.options.resolveLiveActiveSlideId(iframeDoc), 'iframe-doc:slidenext.deck');
});

test('buildEditorDeckRenderOptions reuses the local deck canonical override helper when available', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const buildEditorDeckRenderOptionsSource = extractFunctionSource(
    fileContent,
    'function buildEditorDeckRenderOptions(doc = getIframeDoc(), canonicalDeck = null, options = {}) {',
    '\n\n    function createEditorCanonicalDeckResolver(doc = getIframeDoc()) {'
  );

  const iframeDoc = { label: 'iframe-doc' };
  const canonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: []
  };
  let delegatedArgs = null;
  const calls = [];
  const context = {
    SlideNextCanonicalDeck: {
      isCanonicalDeck(deck) {
        return deck === canonicalDeck;
      }
    },
    SlideNextStudioDeckView: {
      createStudioDeckRenderOptions(doc, nextCanonicalDeck, options) {
        delegatedArgs = { doc, nextCanonicalDeck, options };
        return options.resolveCanonicalDeckOverride(nextCanonicalDeck, doc);
      }
    },
    currentSlideIndex: 0,
    getIframeDoc() {
      return iframeDoc;
    },
    getPersistedActiveSlideId() {
      return 'slide-persisted';
    },
    buildEditorCanonicalDeck(nextDoc) {
      return nextDoc === iframeDoc ? canonicalDeck : null;
    },
    resolveEditorDeckCanonicalOverride(nextDoc, nextCanonicalDeck) {
      calls.push(['resolveEditorDeckCanonicalOverride', nextDoc, nextCanonicalDeck]);
      return canonicalDeck;
    },
    resolveEditorLiveActiveSlideId(nextDoc) {
      return `${nextDoc.label}:${canonicalDeck.kind}`;
    }
  };

  vm.createContext(context);
  vm.runInContext(buildEditorDeckRenderOptionsSource, context);

  const result = context.buildEditorDeckRenderOptions(iframeDoc, canonicalDeck, {
    activeSlideId: 'slide-explicit'
  });

  assert.equal(result, canonicalDeck);
  assert.equal(delegatedArgs.doc, iframeDoc);
  assert.equal(delegatedArgs.nextCanonicalDeck, canonicalDeck);
  assert.equal(typeof delegatedArgs.options.resolveCanonicalDeckOverride, 'function');
  assert.deepEqual(calls, [
    ['resolveEditorDeckCanonicalOverride', iframeDoc, canonicalDeck]
  ]);
});

test('buildEditorDeckSnapshot delegates snapshot build-option composition to the shared snapshot helper when available', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const buildEditorDeckSnapshotSource = extractFunctionSource(
    fileContent,
    'function buildEditorDeckSnapshot(doc = getIframeDoc(), options = {}) {',
    '\n\n    function getStudioActiveSlideIndex(doc = getIframeDoc()) {'
  );

  const calls = [];
  const canonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: [
      { id: 'slide-1', nodes: [] },
      { id: 'slide-2', nodes: [] }
    ]
  };
  const activeSlide = { id: 'active-slide-el' };
  const iframeDoc = {
    label: 'iframe-doc',
    querySelector(selector) {
      assert.equal(selector, '.slide-active');
      return activeSlide;
    }
  };
  let delegatedArgs = null;
  const context = {
    SlideNextStudioDeckSnapshot: {
      createStudioDeckSnapshotBuildOptions(nextDoc, options) {
        delegatedArgs = {
          nextDoc,
          options,
          canonicalDeck: options.buildCanonicalDeck(nextDoc),
          liveActiveSlideId: options.resolveLiveActiveSlideId(nextDoc),
          fallbackActiveSlideId: options.resolveFallbackActiveSlideId(nextDoc, canonicalDeck),
          liveActiveSlide: options.querySelector(nextDoc, '.slide-active')
        };
        return {
          buildCanonicalDeck: () => canonicalDeck,
          fallbackActiveSlideId: 'slide-shared',
          getActiveSlide: () => activeSlide
        };
      },
      buildStudioDeckSnapshot(nextDoc, options) {
        calls.push({
          nextDoc,
          options,
          canonicalDeck: options.buildCanonicalDeck(nextDoc),
          activeSlide: options.getActiveSlide(nextDoc)
        });
        return {
          activeSlideId: options.fallbackActiveSlideId,
          activeSlideIndex: 1,
          slides: []
        };
      }
    },
    buildEditorCanonicalDeck(nextDoc) {
      assert.equal(nextDoc, iframeDoc);
      return canonicalDeck;
    },
    buildEditorDeckSnapshotFromDom() {},
    buildEditorLayerSnapshot() {},
    getEditorSlideId(nextSlide, nextDoc) {
      assert.equal(nextSlide, activeSlide);
      assert.equal(nextDoc, iframeDoc);
      return 'slide-live';
    },
    getIframeDoc() {
      return iframeDoc;
    },
    getSlideById() {
      return null;
    },
    resolveEditorLiveActiveSlideId(nextDoc) {
      assert.equal(nextDoc, iframeDoc);
      return 'slide-live';
    },
    resolveEditorCanonicalDeckViewState(nextDoc, options = {}) {
      assert.equal(nextDoc, iframeDoc);
      return {
        resolveCanonicalDeck() {
          return canonicalDeck;
        },
        liveActiveSlideId: options.resolveLiveActiveSlideId(nextDoc),
        resolvedCanonicalDeck: null
      };
    },
    resolveEditorFallbackActiveSlideId(nextDoc, nextCanonicalDeck) {
      assert.equal(nextDoc, iframeDoc);
      assert.equal(nextCanonicalDeck, canonicalDeck);
      return 'slide-fallback';
    },
    resolveEditorLiveActiveSlide(nextDoc) {
      assert.equal(nextDoc, iframeDoc);
      return activeSlide;
    }
  };

  vm.createContext(context);
  vm.runInContext(buildEditorDeckSnapshotSource, context);

  const result = context.buildEditorDeckSnapshot();

  assert.equal(delegatedArgs.nextDoc, iframeDoc);
  assert.equal(delegatedArgs.liveActiveSlideId, 'slide-live');
  assert.equal(delegatedArgs.canonicalDeck, canonicalDeck);
  assert.equal(delegatedArgs.fallbackActiveSlideId, 'slide-fallback');
  assert.equal(delegatedArgs.liveActiveSlide, activeSlide);
  assert.equal(typeof delegatedArgs.options.querySelector, 'function');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].nextDoc, iframeDoc);
  assert.equal(calls[0].options.fallbackActiveSlideId, 'slide-shared');
  assert.equal(calls[0].canonicalDeck, canonicalDeck);
  assert.equal(calls[0].activeSlide, activeSlide);
  assert.equal(result.activeSlideId, 'slide-shared');
  assert.equal(result.activeSlideIndex, 1);
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
    getActiveSlideId(nextDoc) {
      assert.equal(nextDoc, iframeDoc);
      return 'slide-2';
    },
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
