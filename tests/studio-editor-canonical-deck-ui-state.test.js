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

function loadResolveEditorStoredCanonicalBaseline(fileContent, context) {
  if (typeof context.resolveEditorStoredCanonicalDeck !== 'function') {
    const resolveEditorStoredCanonicalDeckSource = extractFunctionSource(
      fileContent,
      'function resolveEditorStoredCanonicalDeck(metadata) {',
      '\n\n    function resolveEditorStoredCanonicalBaseline(options = {}) {'
    );
    vm.runInContext(resolveEditorStoredCanonicalDeckSource, context);
  }
  const resolveEditorStoredCanonicalBaselineSource = extractFunctionSource(
    fileContent,
    'function resolveEditorStoredCanonicalBaseline(options = {}) {',
    '\n\n    function applyCurrentStudioPersistedDeckState(nextState = {}, options = {}) {'
  );
  vm.runInContext(resolveEditorStoredCanonicalBaselineSource, context);
}

function loadResolveEditorCanonicalDeckViewState(fileContent, context) {
  const resolveEditorCanonicalDeckViewStateSource = extractFunctionSource(
    fileContent,
    'function createEditorCanonicalDeckResolverWithBuilder(\n      doc = getIframeDoc(),\n      buildCanonicalDeck = (sourceDoc) => buildEditorCanonicalDeck(sourceDoc)\n    ) {',
    '\n\n    function buildEditorPreviewHtml(doc = getIframeDoc()) {'
  );
  vm.runInContext(resolveEditorCanonicalDeckViewStateSource, context);
}

function loadBuildEditorCanonicalDeck(fileContent, context, helperSource) {
  if (typeof context.resolveEditorStoredCanonicalDeck !== 'function') {
    loadResolveEditorStoredCanonicalDeck(fileContent, context);
  }
  if (typeof context.resolveEditorStoredCanonicalBaseline !== 'function') {
    loadResolveEditorStoredCanonicalBaseline(fileContent, context);
  }
  vm.runInContext(helperSource, context);
}

function loadCreateEditorCanonicalDeckResolverWithBuilder(fileContent, context) {
  if (typeof context.createEditorCanonicalDeckResolverWithBuilder === 'function') {
    return;
  }
  const helperSource = extractFunctionSource(
    fileContent,
    'function createEditorCanonicalDeckResolverWithBuilder(\n      doc = getIframeDoc(),\n      buildCanonicalDeck = (sourceDoc) => buildEditorCanonicalDeck(sourceDoc)\n    ) {',
    '\n\n    function createEditorCanonicalDeckViewStateOptions(options = {}) {'
  );
  vm.runInContext(helperSource, context);
}

function loadCreateEditorDeckViewSharedOptions(fileContent, context) {
  if (typeof context.resolveEditorCanonicalDeckOverride !== 'function') {
    const resolveEditorCanonicalDeckOverrideSource = extractFunctionSource(
      fileContent,
      'function resolveEditorCanonicalDeckOverride(canonicalDeck = null, options = {}) {',
      '\n\n    function getEditorCanonicalDeckValidator() {'
    );
    vm.runInContext(resolveEditorCanonicalDeckOverrideSource, context);
  }
  if (typeof context.getEditorCanonicalDeckValidator !== 'function') {
    const getEditorCanonicalDeckValidatorSource = extractFunctionSource(
      fileContent,
      'function getEditorCanonicalDeckValidator() {',
      '\n\n    function createEditorDeckViewSharedOptions(doc = getIframeDoc()) {'
    );
    vm.runInContext(getEditorCanonicalDeckValidatorSource, context);
  }
  if (typeof context.createEditorDeckViewSharedOptions !== 'function') {
    const createEditorDeckViewSharedOptionsSource = extractFunctionSource(
      fileContent,
      'function createEditorDeckViewSharedOptions(doc = getIframeDoc()) {',
      '\n\n    function resolveEditorFallbackCanonicalDeck(doc = getIframeDoc(), canonicalDeck = null) {'
    );
    vm.runInContext(createEditorDeckViewSharedOptionsSource, context);
  }
}

function loadResolveEditorFallbackCanonicalDeck(fileContent, context) {
  if (typeof context.resolveEditorFallbackCanonicalDeck === 'function') {
    return;
  }
  loadCreateEditorDeckViewSharedOptions(fileContent, context);
  const resolveEditorFallbackCanonicalDeckSource = extractFunctionSource(
    fileContent,
    'function resolveEditorFallbackCanonicalDeck(doc = getIframeDoc(), canonicalDeck = null) {',
    '\n\n    function getPersistedActiveSlideId(playbackState = persistedDeckPlaybackState) {'
  );
  vm.runInContext(resolveEditorFallbackCanonicalDeckSource, context);
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

test('resolveEditorStoredCanonicalBaseline reuses the shared canonical baseline helper when available', () => {
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
      resolveStudioCanonicalBaseline(options = {}) {
        calls.push(options);
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
  assert.deepEqual(JSON.parse(JSON.stringify(calls)), [{
    currentPresentationMetadata: {
      id: 'deck-1',
      canonicalDeck: currentMetadataCanonicalDeck
    },
    persistedCanonicalDeck
  }]);
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
  loadBuildEditorCanonicalDeck(fileContent, context, buildEditorCanonicalDeckSource);

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
  loadBuildEditorCanonicalDeck(fileContent, context, buildEditorCanonicalDeckSource);

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
  loadBuildEditorCanonicalDeck(fileContent, context, buildEditorCanonicalDeckSource);

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
  loadBuildEditorCanonicalDeck(fileContent, context, buildEditorCanonicalDeckSource);

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
  loadBuildEditorCanonicalDeck(fileContent, context, buildEditorCanonicalDeckSource);

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
  loadBuildEditorCanonicalDeck(fileContent, context, buildEditorCanonicalDeckSource);

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
  loadBuildEditorCanonicalDeck(fileContent, context, buildEditorCanonicalDeckSource);

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

test('getEditorCanonicalDeckValidator returns the shared canonical deck validator when available', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const helperSource = extractFunctionSource(
    fileContent,
    'function getEditorCanonicalDeckValidator() {',
    '\n\n    function createEditorDeckViewSharedOptions(doc = getIframeDoc()) {'
  );

  const context = {
    SlideNextCanonicalDeck: {
      isCanonicalDeck(deck) {
        return !!deck;
      }
    }
  };

  vm.createContext(context);
  vm.runInContext(helperSource, context);

  assert.equal(
    context.getEditorCanonicalDeckValidator(),
    context.SlideNextCanonicalDeck.isCanonicalDeck
  );
});

test('createEditorDeckViewSharedOptions reuses the local deck canonical override selector and validator when available', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const helperSource = extractFunctionSource(
    fileContent,
    'function createEditorDeckViewSharedOptions(doc = getIframeDoc()) {',
    '\n\n    function resolveEditorFallbackCanonicalDeck(doc = getIframeDoc(), canonicalDeck = null) {'
  );

  const iframeDoc = { label: 'iframe-doc' };
  const canonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: []
  };
  const calls = [];
  const helperCalls = [];
  const isCanonicalDeck = (deck) => deck === canonicalDeck;
  const context = {
    currentSlideIndex: 2,
    getPersistedActiveSlideId() {
      return 'slide-persisted';
    },
    createEditorCanonicalDeckViewStateOptions() {
      helperCalls.push('createEditorCanonicalDeckViewStateOptions');
      return {
        buildCanonicalDeck(nextDoc) {
          calls.push(['buildCanonicalDeck', nextDoc]);
          return canonicalDeck;
        },
        resolveLiveActiveSlideId(nextDoc) {
          calls.push(['resolveLiveActiveSlideId', nextDoc]);
          return 'slide-live';
        }
      };
    },
    buildEditorCanonicalDeck(nextDoc) {
      calls.push(['buildEditorCanonicalDeck', nextDoc]);
      return canonicalDeck;
    },
    getEditorCanonicalDeckValidator() {
      calls.push(['getEditorCanonicalDeckValidator']);
      return isCanonicalDeck;
    },
    getIframeDoc() {
      return iframeDoc;
    },
    resolveEditorCanonicalDeckOverride(nextCanonicalDeck, options = {}) {
      calls.push(['resolveEditorCanonicalDeckOverride', nextCanonicalDeck, options.buildCanonicalDeck]);
      return canonicalDeck;
    },
    resolveEditorLiveActiveSlideId(nextDoc) {
      calls.push(['resolveEditorLiveActiveSlideId', nextDoc]);
      return 'slide-live';
    }
  };

  vm.createContext(context);
  vm.runInContext(helperSource, context);

  const options = context.createEditorDeckViewSharedOptions(iframeDoc);

  assert.equal(options.currentSlideIndex, 2);
  assert.equal(options.getPersistedActiveSlideId, context.getPersistedActiveSlideId);
  assert.equal(options.resolveCanonicalDeck(iframeDoc), canonicalDeck);
  assert.equal(options.resolveCanonicalDeckOverride(canonicalDeck, iframeDoc), canonicalDeck);
  assert.equal(options.resolveLiveActiveSlideId(iframeDoc), 'slide-live');
  assert.equal(options.isCanonicalDeck, isCanonicalDeck);
  assert.deepEqual(helperCalls, ['createEditorCanonicalDeckViewStateOptions']);
  assert.equal(calls.length, 4);
  assert.deepEqual(calls.slice(0, 2), [
    ['getEditorCanonicalDeckValidator'],
    ['buildCanonicalDeck', iframeDoc]
  ]);
  assert.equal(calls[2][0], 'resolveEditorCanonicalDeckOverride');
  assert.equal(calls[2][1], canonicalDeck);
  assert.equal(typeof calls[2][2], 'function');
  assert.deepEqual(calls[3], ['resolveLiveActiveSlideId', iframeDoc]);
});

test('resolveEditorFallbackCanonicalDeck reuses the local deck canonical override resolver when available', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const helperSource = extractFunctionSource(
    fileContent,
    'function resolveEditorFallbackCanonicalDeck(doc = getIframeDoc(), canonicalDeck = null) {',
    '\n\n    function getPersistedActiveSlideId(playbackState = persistedDeckPlaybackState) {'
  );

  const iframeDoc = { label: 'iframe-doc' };
  const rebuiltCanonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: [
      { id: 'slide-1', nodes: [] }
    ]
  };
  const malformedCanonicalDeck = {
    metadata: {
      title: 'Broken Deck'
    }
  };
  const calls = [];
  const isCanonicalDeck = (deck) => {
    calls.push(['isCanonicalDeck', deck]);
    return deck === rebuiltCanonicalDeck;
  };
  const context = {
    resolveEditorCanonicalDeckOverride(nextCanonicalDeck, options = {}) {
      calls.push(['resolveEditorCanonicalDeckOverride', nextCanonicalDeck, options.buildCanonicalDeck]);
      return malformedCanonicalDeck;
    },
    buildEditorCanonicalDeck(nextDoc) {
      calls.push(['buildEditorCanonicalDeck', nextDoc]);
      return rebuiltCanonicalDeck;
    },
    getEditorCanonicalDeckValidator() {
      calls.push(['getEditorCanonicalDeckValidator']);
      return isCanonicalDeck;
    },
    getIframeDoc() {
      return iframeDoc;
    }
  };

  vm.createContext(context);
  vm.runInContext(helperSource, context);

  const result = context.resolveEditorFallbackCanonicalDeck(iframeDoc, malformedCanonicalDeck);

  assert.equal(result, rebuiltCanonicalDeck);
  assert.equal(calls.length, 4);
  assert.equal(calls[0][0], 'resolveEditorCanonicalDeckOverride');
  assert.equal(calls[0][1], malformedCanonicalDeck);
  assert.equal(typeof calls[0][2], 'function');
  assert.deepEqual(calls.slice(1), [
    ['getEditorCanonicalDeckValidator'],
    ['isCanonicalDeck', malformedCanonicalDeck],
    ['buildEditorCanonicalDeck', iframeDoc]
  ]);
});

test('resolveEditorFallbackCanonicalDeck rebuilds malformed canonical deck input through the local deck override helper path', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const helperSource = extractFunctionSource(
    fileContent,
    'function resolveEditorFallbackCanonicalDeck(doc = getIframeDoc(), canonicalDeck = null) {',
    '\n\n    function getPersistedActiveSlideId(playbackState = persistedDeckPlaybackState) {'
  );

  const iframeDoc = { label: 'iframe-doc' };
  const rebuiltCanonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: [
      { id: 'slide-1', nodes: [] }
    ]
  };
  const malformedCanonicalDeck = {
    metadata: {
      title: 'Broken Deck'
    }
  };
  const calls = [];
  const context = {
    SlideNextCanonicalDeck: {
      isCanonicalDeck(deck) {
        calls.push(['isCanonicalDeck', deck]);
        return deck === rebuiltCanonicalDeck;
      }
    },
    resolveEditorCanonicalDeckOverride(nextCanonicalDeck, options = {}) {
      calls.push(['resolveEditorCanonicalDeckOverride', nextCanonicalDeck, options.buildCanonicalDeck]);
      return malformedCanonicalDeck;
    },
    buildEditorCanonicalDeck(nextDoc) {
      calls.push(['buildEditorCanonicalDeck', nextDoc]);
      return rebuiltCanonicalDeck;
    },
    getEditorCanonicalDeckValidator() {
      return context.SlideNextCanonicalDeck.isCanonicalDeck;
    },
    getIframeDoc() {
      return iframeDoc;
    }
  };

  vm.createContext(context);
  vm.runInContext(helperSource, context);

  const result = context.resolveEditorFallbackCanonicalDeck(iframeDoc, malformedCanonicalDeck);

  assert.equal(result, rebuiltCanonicalDeck);
  assert.equal(calls.length, 3);
  assert.equal(calls[0][0], 'resolveEditorCanonicalDeckOverride');
  assert.equal(calls[0][1], malformedCanonicalDeck);
  assert.equal(typeof calls[0][2], 'function');
  assert.deepEqual(calls.slice(1), [
    ['isCanonicalDeck', malformedCanonicalDeck],
    ['buildEditorCanonicalDeck', iframeDoc]
  ]);
});

test('resolveEditorFallbackCanonicalDeck delegates fallback deck resolution through the shared persistence helper when available', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const helperSource = extractFunctionSource(
    fileContent,
    'function resolveEditorFallbackCanonicalDeck(doc = getIframeDoc(), canonicalDeck = null) {',
    '\n\n    function getPersistedActiveSlideId(playbackState = persistedDeckPlaybackState) {'
  );

  const iframeDoc = { label: 'iframe-doc' };
  const malformedCanonicalDeck = {
    metadata: {
      title: 'Broken Deck'
    }
  };
  const resolvedCanonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: [
      { id: 'slide-1', nodes: [] }
    ]
  };
  const isCanonicalDeck = (deck) => deck === resolvedCanonicalDeck;
  let helperCall = null;
  const context = {
    SlideNextStudioEditorPersistence: {
      resolveStudioFallbackCanonicalDeck(nextCanonicalDeck, options = {}) {
        helperCall = {
          nextCanonicalDeck,
          hasBuildCanonicalDeck: typeof options.buildCanonicalDeck === 'function',
          hasResolveCanonicalDeckOverride: typeof options.resolveCanonicalDeckOverride === 'function',
          isCanonicalDeck: options.isCanonicalDeck
        };
        return resolvedCanonicalDeck;
      }
    },
    buildEditorCanonicalDeck() {
      throw new Error('buildEditorCanonicalDeck should be delegated through the shared fallback helper');
    },
    getEditorCanonicalDeckValidator() {
      return isCanonicalDeck;
    },
    getIframeDoc() {
      return iframeDoc;
    },
    resolveEditorCanonicalDeckOverride() {
      throw new Error('resolveEditorCanonicalDeckOverride should be delegated through the shared fallback helper');
    }
  };

  vm.createContext(context);
  vm.runInContext(helperSource, context);

  const result = context.resolveEditorFallbackCanonicalDeck(iframeDoc, malformedCanonicalDeck);

  assert.equal(result, resolvedCanonicalDeck);
  assert.deepEqual(helperCall, {
    nextCanonicalDeck: malformedCanonicalDeck,
    hasBuildCanonicalDeck: true,
    hasResolveCanonicalDeckOverride: true,
    isCanonicalDeck
  });
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
    SlideNextStudioEditorPersistence: {
      resolveStudioCanonicalDeckOverride(options) {
        const hasValidCanonicalDeck = options.isCanonicalDeck
          ? options.isCanonicalDeck(options.canonicalDeck)
          : !!(options.canonicalDeck && Array.isArray(options.canonicalDeck.slides));
        return hasValidCanonicalDeck
          ? options.canonicalDeck
          : options.buildCanonicalDeck();
      }
    },
    buildEditorCanonicalDeck(nextDoc) {
      calls.push(['buildEditorCanonicalDeck', nextDoc]);
      return rebuiltCanonicalDeck;
    },
    createEditorPersistableCanonicalDeckOverrideResolver(nextDoc, nextCanonicalDeck) {
      return (shouldBuildFallbackCanonicalDeck = false) => context.resolveEditorCanonicalDeckOverride(nextCanonicalDeck, {
        buildCanonicalDeck: shouldBuildFallbackCanonicalDeck
          ? () => context.buildEditorCanonicalDeck(nextDoc)
          : null
      });
    },
    currentSlideIndex: 1,
    getIframeDoc() {
      return iframeDoc;
    },
    getActiveSlide(nextDoc) {
      assert.equal(nextDoc, iframeDoc);
      return null;
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
  loadResolveEditorFallbackCanonicalDeck(fileContent, context);
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
  const deckViewSharedOptions = {
    currentSlideIndex: 0,
    getPersistedActiveSlideId() {
      return 'slide-persisted';
    },
    resolveCanonicalDeck() {
      return canonicalDeck;
    },
    resolveCanonicalDeckOverride(nextCanonicalDeck) {
      return nextCanonicalDeck;
    },
    resolveLiveActiveSlideId() {
      return '';
    },
    isCanonicalDeck(deck) {
      return deck === canonicalDeck;
    }
  };
  let delegatedArgs = null;
  const context = {
    SlideNextStudioDeckView: {
      resolveStudioFallbackActiveSlideId(doc, nextCanonicalDeck, options) {
        delegatedArgs = { doc, nextCanonicalDeck, options };
        return 'slide-shared';
      }
    },
    createEditorDeckViewSharedOptions(nextDoc) {
      assert.equal(nextDoc, iframeDoc);
      return deckViewSharedOptions;
    },
    getIframeDoc() {
      return iframeDoc;
    }
  };

  vm.createContext(context);
  loadResolveEditorFallbackCanonicalDeck(fileContent, context);
  vm.runInContext(resolveEditorFallbackActiveSlideIdSource, context);

  const result = context.resolveEditorFallbackActiveSlideId(iframeDoc, canonicalDeck);

  assert.equal(result, 'slide-shared');
  assert.equal(delegatedArgs.doc, iframeDoc);
  assert.equal(delegatedArgs.nextCanonicalDeck, canonicalDeck);
  assert.equal(delegatedArgs.options, deckViewSharedOptions);
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
  loadCreateEditorDeckViewSharedOptions(fileContent, context);
  loadResolveEditorFallbackCanonicalDeck(fileContent, context);
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

test('resolveEditorFallbackActiveSlideId reuses the local deck view shared options helper when available', () => {
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
  const deckViewSharedOptions = {
    currentSlideIndex: 0,
    getPersistedActiveSlideId() {
      return 'slide-persisted';
    },
    resolveCanonicalDeck() {
      return canonicalDeck;
    },
    resolveCanonicalDeckOverride(nextCanonicalDeck, sourceDoc) {
      calls.push(['resolveCanonicalDeckOverride', nextCanonicalDeck, sourceDoc]);
      return canonicalDeck;
    },
    resolveLiveActiveSlideId() {
      return '';
    },
    isCanonicalDeck(deck) {
      return deck === canonicalDeck;
    }
  };
  const context = {
    SlideNextStudioDeckView: {
      resolveStudioFallbackActiveSlideId(doc, nextCanonicalDeck, options) {
        delegatedArgs = { doc, nextCanonicalDeck, options };
        return options.resolveCanonicalDeckOverride(nextCanonicalDeck, doc);
      }
    },
    createEditorDeckViewSharedOptions(nextDoc) {
      calls.push(['createEditorDeckViewSharedOptions', nextDoc]);
      return deckViewSharedOptions;
    }
    ,
    getIframeDoc() {
      return iframeDoc;
    }
  };

  vm.createContext(context);
  loadResolveEditorFallbackCanonicalDeck(fileContent, context);
  vm.runInContext(resolveEditorFallbackActiveSlideIdSource, context);

  const result = context.resolveEditorFallbackActiveSlideId(iframeDoc, canonicalDeck);

  assert.equal(result, canonicalDeck);
  assert.equal(delegatedArgs.doc, iframeDoc);
  assert.equal(delegatedArgs.nextCanonicalDeck, canonicalDeck);
  assert.equal(delegatedArgs.options, deckViewSharedOptions);
  assert.deepEqual(calls, [
    ['createEditorDeckViewSharedOptions', iframeDoc],
    ['resolveCanonicalDeckOverride', canonicalDeck, iframeDoc]
  ]);
});

test('resolveEditorFallbackActiveSlideId reuses the local fallback canonical deck helper when the shared deck view helper is unavailable', () => {
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
      { id: 'slide-1', nodes: [] },
      { id: 'slide-2', nodes: [] }
    ]
  };
  const calls = [];
  const context = {
    currentSlideIndex: 1,
    getIframeDoc() {
      return iframeDoc;
    },
    getActiveSlide(nextDoc) {
      assert.equal(nextDoc, iframeDoc);
      return null;
    },
    getPersistedActiveSlideId() {
      calls.push(['getPersistedActiveSlideId']);
      return 'slide-persisted';
    },
    resolveEditorFallbackCanonicalDeck(nextDoc, nextCanonicalDeck) {
      calls.push(['resolveEditorFallbackCanonicalDeck', nextDoc, nextCanonicalDeck]);
      return canonicalDeck;
    },
    resolveEditorLiveActiveSlideId(nextDoc) {
      calls.push(['resolveEditorLiveActiveSlideId', nextDoc]);
      return '';
    }
  };

  vm.createContext(context);
  loadResolveEditorFallbackCanonicalDeck(fileContent, context);
  vm.runInContext(resolveEditorFallbackActiveSlideIdSource, context);

  const result = context.resolveEditorFallbackActiveSlideId(iframeDoc, canonicalDeck);

  assert.equal(result, 'slide-2');
  assert.deepEqual(calls, [
    ['getPersistedActiveSlideId'],
    ['resolveEditorFallbackCanonicalDeck', iframeDoc, canonicalDeck]
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
    getActiveSlide(nextDoc) {
      assert.equal(nextDoc, iframeDoc);
      return null;
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
  loadResolveEditorFallbackCanonicalDeck(fileContent, context);
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
  assert.equal(typeof delegatedArgs.options.getActiveSlideId, 'function');
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

test('resolveEditorLiveActiveSlide returns null when the iframe doc is unavailable', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const resolveEditorLiveActiveSlideSource = extractFunctionSource(
    fileContent,
    'function resolveEditorLiveActiveSlide(doc = getIframeDoc()) {',
    '\n\n    function buildEditorDeckRenderOptions(doc = getIframeDoc(), canonicalDeck = null, options = {}) {'
  );

  const context = {
    getIframeDoc() {
      return null;
    }
  };

  vm.createContext(context);
  vm.runInContext(resolveEditorLiveActiveSlideSource, context);

  assert.equal(context.resolveEditorLiveActiveSlide(), null);
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
    'function createEditorCanonicalDeckResolverWithBuilder(\n      doc = getIframeDoc(),\n      buildCanonicalDeck = (sourceDoc) => buildEditorCanonicalDeck(sourceDoc)\n    ) {',
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

test('createEditorCanonicalDeckResolverWithBuilder caches the first canonical deck build for local view-state fallbacks', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const helperSource = extractFunctionSource(
    fileContent,
    'function createEditorCanonicalDeckResolverWithBuilder(\n      doc = getIframeDoc(),\n      buildCanonicalDeck = (sourceDoc) => buildEditorCanonicalDeck(sourceDoc)\n    ) {',
    '\n\n    function createEditorCanonicalDeckViewStateOptions(options = {}) {'
  );

  const iframeDoc = { label: 'iframe-doc' };
  const canonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: []
  };
  const calls = [];
  const context = {
    buildEditorCanonicalDeck(nextDoc) {
      calls.push(['buildEditorCanonicalDeck', nextDoc]);
      return canonicalDeck;
    },
    getIframeDoc() {
      return iframeDoc;
    }
  };

  vm.createContext(context);
  vm.runInContext(helperSource, context);

  const resolveCanonicalDeck = context.createEditorCanonicalDeckResolverWithBuilder(iframeDoc, (nextDoc) => {
    calls.push(['buildCanonicalDeck', nextDoc]);
    return canonicalDeck;
  });

  assert.equal(resolveCanonicalDeck(iframeDoc), canonicalDeck);
  assert.equal(resolveCanonicalDeck({ label: 'other-doc' }), canonicalDeck);
  assert.deepEqual(calls, [
    ['buildCanonicalDeck', iframeDoc]
  ]);
});

test('resolveEditorCanonicalDeckViewState reuses the local deck view state options helper when available', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const resolveEditorCanonicalDeckViewStateSource = extractFunctionSource(
    fileContent,
    'function resolveEditorCanonicalDeckViewState(doc = getIframeDoc(), options = {}) {',
    '\n\n    function createEditorDeckViewBuildOptions(doc = getIframeDoc()) {'
  );

  const iframeDoc = { label: 'iframe-doc' };
  const canonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: []
  };
  const calls = [];
  const customBuildCanonicalDeck = () => canonicalDeck;
  const context = {
    createEditorCanonicalDeckViewStateOptions(options = {}) {
      calls.push([
        'createEditorCanonicalDeckViewStateOptions',
        typeof options.buildCanonicalDeck === 'function'
      ]);
      return {
        buildCanonicalDeck(sourceDoc) {
          calls.push(['buildCanonicalDeck', sourceDoc]);
          return canonicalDeck;
        },
        resolveLiveActiveSlideId(sourceDoc) {
          calls.push(['resolveLiveActiveSlideId', sourceDoc]);
          return '';
        }
      };
    },
    getIframeDoc() {
      return iframeDoc;
    }
  };

  vm.createContext(context);
  loadCreateEditorCanonicalDeckResolverWithBuilder(fileContent, context);
  vm.runInContext(resolveEditorCanonicalDeckViewStateSource, context);

  const result = context.resolveEditorCanonicalDeckViewState(iframeDoc, {
    buildCanonicalDeck: customBuildCanonicalDeck
  });

  assert.equal(result.liveActiveSlideId, '');
  assert.equal(result.resolvedCanonicalDeck, canonicalDeck);
  assert.deepEqual(calls, [
    ['createEditorCanonicalDeckViewStateOptions', true],
    ['resolveLiveActiveSlideId', iframeDoc],
    ['buildCanonicalDeck', iframeDoc]
  ]);
});

test('resolveEditorCanonicalDeckViewState reuses the local canonical deck resolver builder helper when a custom canonical builder is provided', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const resolveEditorCanonicalDeckViewStateSource = extractFunctionSource(
    fileContent,
    'function resolveEditorCanonicalDeckViewState(doc = getIframeDoc(), options = {}) {',
    '\n\n    function createEditorDeckViewBuildOptions(doc = getIframeDoc()) {'
  );

  const iframeDoc = { label: 'iframe-doc' };
  const canonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: []
  };
  const calls = [];
  const context = {
    createEditorCanonicalDeckResolverWithBuilder(nextDoc, buildCanonicalDeck) {
      calls.push(['createEditorCanonicalDeckResolverWithBuilder', nextDoc, typeof buildCanonicalDeck]);
      return (sourceDoc = nextDoc) => {
        calls.push(['resolveCanonicalDeck', sourceDoc]);
        return canonicalDeck;
      };
    },
    createEditorCanonicalDeckViewStateOptions(options = {}) {
      return {
        buildCanonicalDeck: options.buildCanonicalDeck,
        resolveLiveActiveSlideId() {
          return '';
        }
      };
    },
    getIframeDoc() {
      return iframeDoc;
    }
  };

  vm.createContext(context);
  vm.runInContext(resolveEditorCanonicalDeckViewStateSource, context);

  const result = context.resolveEditorCanonicalDeckViewState(iframeDoc, {
    buildCanonicalDeck() {
      return canonicalDeck;
    }
  });

  assert.equal(result.resolvedCanonicalDeck, canonicalDeck);
  assert.deepEqual(calls, [
    ['createEditorCanonicalDeckResolverWithBuilder', iframeDoc, 'function'],
    ['resolveCanonicalDeck', iframeDoc]
  ]);
});

test('resolveEditorCanonicalDeckViewState delegates fallback resolver creation to the shared snapshot helper when deck view helper is unavailable', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const resolveEditorCanonicalDeckViewStateSource = extractFunctionSource(
    fileContent,
    'function createEditorCanonicalDeckResolverWithBuilder(\n      doc = getIframeDoc(),\n      buildCanonicalDeck = (sourceDoc) => buildEditorCanonicalDeck(sourceDoc)\n    ) {',
    '\n\n    function createEditorDeckViewBuildOptions(doc = getIframeDoc()) {'
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
    },
    resolveEditorLiveActiveSlideId() {
      return '';
    }
  };

  vm.createContext(context);
  vm.runInContext(resolveEditorCanonicalDeckViewStateSource, context);

  const result = context.resolveEditorCanonicalDeckViewState(iframeDoc);

  assert.equal(delegatedArgs.doc, iframeDoc);
  assert.equal(typeof delegatedArgs.options.buildCanonicalDeck, 'function');
  assert.equal(typeof result.resolveCanonicalDeck, 'function');
  assert.equal(result.resolvedCanonicalDeck, canonicalDeck);
});

test('resolveEditorCanonicalDeckViewState reuses the local canonical deck resolver builder helper when shared resolvers are unavailable', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const resolveEditorCanonicalDeckViewStateSource = extractFunctionSource(
    fileContent,
    'function createEditorCanonicalDeckResolverWithBuilder(\n      doc = getIframeDoc(),\n      buildCanonicalDeck = (sourceDoc) => buildEditorCanonicalDeck(sourceDoc)\n    ) {',
    '\n\n    function createEditorDeckViewBuildOptions(doc = getIframeDoc()) {'
  );

  const iframeDoc = { label: 'iframe-doc' };
  const canonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: []
  };
  const calls = [];
  const context = {
    __createEditorCanonicalDeckViewStateOptions() {
      calls.push(['createEditorCanonicalDeckViewStateOptions']);
      return {
        buildCanonicalDeck(sourceDoc) {
          calls.push(['buildCanonicalDeck', sourceDoc]);
          return canonicalDeck;
        },
        resolveLiveActiveSlideId() {
          return '';
        }
      };
    },
    __createEditorCanonicalDeckResolverWithBuilder(nextDoc, buildCanonicalDeck) {
      calls.push(['createEditorCanonicalDeckResolverWithBuilder', nextDoc, typeof buildCanonicalDeck]);
      return (sourceDoc = nextDoc) => {
        calls.push(['resolveCanonicalDeck', sourceDoc]);
        return canonicalDeck;
      };
    },
    getIframeDoc() {
      return iframeDoc;
    }
  };

  vm.createContext(context);
  vm.runInContext(resolveEditorCanonicalDeckViewStateSource, context);
  vm.runInContext('createEditorCanonicalDeckViewStateOptions = __createEditorCanonicalDeckViewStateOptions;', context);
  vm.runInContext('createEditorCanonicalDeckResolverWithBuilder = __createEditorCanonicalDeckResolverWithBuilder;', context);

  const result = context.resolveEditorCanonicalDeckViewState(iframeDoc);

  assert.equal(typeof result.resolveCanonicalDeck, 'function');
  assert.equal(result.resolvedCanonicalDeck, canonicalDeck);
  assert.deepEqual(calls, [
    ['createEditorCanonicalDeckViewStateOptions'],
    ['createEditorCanonicalDeckResolverWithBuilder', iframeDoc, 'function'],
    ['resolveCanonicalDeck', iframeDoc]
  ]);
});

test('createEditorDeckViewBuildOptions delegates build-option composition to the shared deck view helper when available', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const resolveEditorCanonicalDeckViewStateSource = extractFunctionSource(
    fileContent,
    'function createEditorCanonicalDeckResolverWithBuilder(\n      doc = getIframeDoc(),\n      buildCanonicalDeck = (sourceDoc) => buildEditorCanonicalDeck(sourceDoc)\n    ) {',
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

test('createEditorDeckViewBuildOptions reuses the local deck view state options helper when available', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const createEditorDeckViewBuildOptionsSource = extractFunctionSource(
    fileContent,
    'function createEditorDeckViewBuildOptions(doc = getIframeDoc()) {',
    '\n\n    function buildEditorDeckHtml(doc = getIframeDoc(), options = {}) {'
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
    createEditorCanonicalDeckViewStateOptions(options = {}) {
      calls.push(['createEditorCanonicalDeckViewStateOptions', options.activeSlideId || '']);
      return {
        buildCanonicalDeck(sourceDoc) {
          calls.push(['buildCanonicalDeck', sourceDoc]);
          return canonicalDeck;
        },
        resolveLiveActiveSlideId(sourceDoc) {
          calls.push(['resolveLiveActiveSlideId', sourceDoc]);
          return 'slide-live';
        }
      };
    },
    buildPersistableDeckHtml(nextDoc, options = {}) {
      return JSON.stringify({ nextDoc, canonicalDeck: options.canonicalDeck });
    },
    getIframeDoc() {
      return iframeDoc;
    }
  };

  vm.createContext(context);
  vm.runInContext(createEditorDeckViewBuildOptionsSource, context);

  const result = context.createEditorDeckViewBuildOptions(iframeDoc);

  assert.equal(result.buildCanonicalDeck(), canonicalDeck);
  assert.equal(result.buildFallbackHtml(), '<html>fallback</html>');
  assert.equal(result.deckHtmlOptions.renderOptions.activeSlideId, 'slide-live');
  assert.equal(delegatedArgs.doc, iframeDoc);
  assert.equal(typeof delegatedArgs.options.buildCanonicalDeck, 'function');
  assert.equal(typeof delegatedArgs.options.resolveLiveActiveSlideId, 'function');
  assert.deepEqual(calls, [
    ['createEditorCanonicalDeckViewStateOptions', '']
  ]);
});

test('createEditorDeckViewBuildOptions forwards custom build overrides to the shared deck view helper', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const resolveEditorCanonicalDeckViewStateSource = extractFunctionSource(
    fileContent,
    'function createEditorCanonicalDeckResolverWithBuilder(\n      doc = getIframeDoc(),\n      buildCanonicalDeck = (sourceDoc) => buildEditorCanonicalDeck(sourceDoc)\n    ) {',
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
    '\n\n    function createEditorCanonicalDeckResolverWithBuilder(\n      doc = getIframeDoc(),\n      buildCanonicalDeck = (sourceDoc) => buildEditorCanonicalDeck(sourceDoc)\n    ) {'
  );

  const iframeDoc = { label: 'iframe-doc' };
  const canonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: []
  };
  const deckViewSharedOptions = {
    currentSlideIndex: 0,
    getPersistedActiveSlideId() {
      return 'slide-persisted';
    },
    resolveCanonicalDeck() {
      return canonicalDeck;
    },
    resolveCanonicalDeckOverride(nextCanonicalDeck) {
      return nextCanonicalDeck;
    },
    resolveLiveActiveSlideId(nextDoc) {
      return `${nextDoc.label}:${canonicalDeck.kind}`;
    },
    isCanonicalDeck(deck) {
      return deck === canonicalDeck;
    }
  };
  let delegatedArgs = null;
  const context = {
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
    createEditorDeckViewSharedOptions(nextDoc) {
      assert.equal(nextDoc, iframeDoc);
      return deckViewSharedOptions;
    },
    getIframeDoc() {
      return iframeDoc;
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
  assert.equal(delegatedArgs.options.currentSlideIndex, deckViewSharedOptions.currentSlideIndex);
  assert.equal(delegatedArgs.options.getPersistedActiveSlideId, deckViewSharedOptions.getPersistedActiveSlideId);
  assert.equal(delegatedArgs.options.resolveCanonicalDeck, deckViewSharedOptions.resolveCanonicalDeck);
  assert.equal(delegatedArgs.options.resolveCanonicalDeckOverride, deckViewSharedOptions.resolveCanonicalDeckOverride);
  assert.equal(delegatedArgs.options.resolveLiveActiveSlideId, deckViewSharedOptions.resolveLiveActiveSlideId);
  assert.equal(delegatedArgs.options.isCanonicalDeck, deckViewSharedOptions.isCanonicalDeck);
});

test('buildEditorDeckRenderOptions reuses the local deck view shared options helper when available', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const buildEditorDeckRenderOptionsSource = extractFunctionSource(
    fileContent,
    'function buildEditorDeckRenderOptions(doc = getIframeDoc(), canonicalDeck = null, options = {}) {',
    '\n\n    function createEditorCanonicalDeckResolverWithBuilder(\n      doc = getIframeDoc(),\n      buildCanonicalDeck = (sourceDoc) => buildEditorCanonicalDeck(sourceDoc)\n    ) {'
  );

  const iframeDoc = { label: 'iframe-doc' };
  const canonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: []
  };
  let delegatedArgs = null;
  const calls = [];
  const deckViewSharedOptions = {
    currentSlideIndex: 0,
    getPersistedActiveSlideId() {
      return 'slide-persisted';
    },
    resolveCanonicalDeck() {
      return canonicalDeck;
    },
    resolveCanonicalDeckOverride(nextCanonicalDeck, sourceDoc) {
      calls.push(['resolveCanonicalDeckOverride', nextCanonicalDeck, sourceDoc]);
      return canonicalDeck;
    },
    resolveLiveActiveSlideId(nextDoc) {
      return `${nextDoc.label}:${canonicalDeck.kind}`;
    },
    isCanonicalDeck(deck) {
      return deck === canonicalDeck;
    }
  };
  const context = {
    SlideNextStudioDeckView: {
      createStudioDeckRenderOptions(doc, nextCanonicalDeck, options) {
        delegatedArgs = { doc, nextCanonicalDeck, options };
        return options.resolveCanonicalDeckOverride(nextCanonicalDeck, doc);
      }
    },
    createEditorDeckViewSharedOptions(nextDoc) {
      calls.push(['createEditorDeckViewSharedOptions', nextDoc]);
      return deckViewSharedOptions;
    },
    getIframeDoc() {
      return iframeDoc;
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
  assert.equal(delegatedArgs.options.resolveCanonicalDeckOverride, deckViewSharedOptions.resolveCanonicalDeckOverride);
  assert.deepEqual(calls, [
    ['createEditorDeckViewSharedOptions', iframeDoc],
    ['resolveCanonicalDeckOverride', canonicalDeck, iframeDoc]
  ]);
});

test('createEditorDeckViewHtmlOptions maps canonical html arguments when local helpers are available', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const createEditorDeckViewHtmlOptionsSource = extractFunctionSource(
    fileContent,
    'function createEditorDeckViewHtmlOptions(options = {}) {',
    '\n\n    function buildEditorSourceDeckHtml(doc = getIframeDoc(), options = {}) {'
  );

  const canonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: []
  };
  const deckHtmlOptions = {
    renderOptions: {
      activeSlideId: 'slide-live'
    }
  };
  const canonicalHtmlCalls = [];
  const customBuildCanonicalHtml = (...args) => {
    canonicalHtmlCalls.push(args);
    return '<html>canonical</html>';
  };
  const context = {};

  vm.createContext(context);
  vm.runInContext(createEditorDeckViewHtmlOptionsSource, context);

  const result = context.createEditorDeckViewHtmlOptions({
    buildCanonicalHtml: customBuildCanonicalHtml,
    mapCanonicalHtmlArgs(nextCanonicalDeck, nextDeckHtmlOptions) {
      return [nextDeckHtmlOptions, nextCanonicalDeck, 'mapped'];
    }
  });

  assert.equal(typeof result.buildViewOptions, 'function');
  assert.equal(typeof result.buildCanonicalHtml, 'function');
  assert.equal(result.buildCanonicalHtml(canonicalDeck, deckHtmlOptions), '<html>canonical</html>');
  assert.deepEqual(canonicalHtmlCalls, [
    [deckHtmlOptions, canonicalDeck, 'mapped']
  ]);
});

test('createEditorDeckViewHtmlOptions extends fallback deck view build options when local helpers are available', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const createEditorDeckViewHtmlOptionsSource = extractFunctionSource(
    fileContent,
    'function createEditorDeckViewHtmlOptions(options = {}) {',
    '\n\n    function buildEditorSourceDeckHtml(doc = getIframeDoc(), options = {}) {'
  );

  const iframeDoc = { label: 'iframe-doc' };
  const baseDeckViewOptions = {
    buildCanonicalDeck() {
      return {
        kind: 'slidenext.deck',
        schemaVersion: 1,
        slides: []
      };
    }
  };
  const calls = [];
  const context = {
    createEditorDeckViewBuildOptions(sourceDoc) {
      calls.push(['createEditorDeckViewBuildOptions', sourceDoc]);
      return baseDeckViewOptions;
    }
  };

  vm.createContext(context);
  vm.runInContext(createEditorDeckViewHtmlOptionsSource, context);

  const result = context.createEditorDeckViewHtmlOptions({
    extendViewOptions(deckViewOptions, sourceDoc) {
      calls.push(['extendViewOptions', deckViewOptions, sourceDoc]);
      return {
        ...deckViewOptions,
        activeSlideId: 'slide-live'
      };
    }
  });

  assert.equal(typeof result.buildViewOptions, 'function');
  assert.deepEqual(result.buildViewOptions(iframeDoc), {
    ...baseDeckViewOptions,
    activeSlideId: 'slide-live'
  });
  assert.deepEqual(calls, [
    ['createEditorDeckViewBuildOptions', iframeDoc],
    ['extendViewOptions', baseDeckViewOptions, iframeDoc]
  ]);
});

test('buildEditorPreviewHtml forwards preview deck view builders when local helpers are available', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const buildEditorPreviewHtmlSource = extractFunctionSource(
    fileContent,
    'function buildEditorPreviewHtml(doc = getIframeDoc()) {',
    '\n\n    function buildEditorSourceDeckHtml(doc = getIframeDoc(), options = {}) {'
  );

  const iframeDoc = { label: 'iframe-doc' };
  const previewDeckViewHtmlOptions = {
    buildSharedHtml() {},
    buildViewOptions() {},
    buildCanonicalHtml() {},
    transformFallbackHtml() {}
  };
  const canonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: []
  };
  const deckHtmlOptions = {
    renderOptions: {
      activeSlideId: 'slide-live'
    }
  };
  const calls = [];
  let delegatedArgs = null;
  let delegatedBuildEditorDeckViewHtmlArgs = null;
  const buildStudioPreviewHtml = function buildStudioPreviewHtml() {};
  const buildDeckPreviewHtml = function buildDeckPreviewHtml() {};
  const context = {
    __buildEditorDeckViewHtml(doc, options) {
      delegatedBuildEditorDeckViewHtmlArgs = { doc, options };
      return '<html>preview-from-build-editor-deck-view-html</html>';
    },
    __createEditorDeckViewHtmlOptions(options) {
      delegatedArgs = options;
      return previewDeckViewHtmlOptions;
    },
    __resolveDeckHtmlMethod(methodName) {
      if (methodName === 'buildDeckPreviewHtml') {
        return buildDeckPreviewHtml;
      }
      if (methodName === 'injectBaseHrefIntoHtml') {
        return function injectBaseHrefIntoHtml(fallbackHtml, baseHref) {
          calls.push(['injectBaseHrefIntoHtml', fallbackHtml, baseHref]);
          return `<html data-base="${baseHref}">${fallbackHtml}</html>`;
        };
      }
      if (methodName === 'buildPresentationBaseHref') {
        return function buildPresentationBaseHref(presentationUrl, nextDeckHtmlOptions) {
          calls.push(['buildPresentationBaseHref', presentationUrl, nextDeckHtmlOptions]);
          return `${presentationUrl}#preview`;
        };
      }
      return null;
    },
    __resolveStudioDeckViewMethod(methodName) {
      if (methodName === 'buildStudioPreviewHtml') {
        return buildStudioPreviewHtml;
      }
      return null;
    },
    currentPresentationUrl: '/presentations/demo/index.html',
    getIframeDoc() {
      return iframeDoc;
    }
  };

  vm.createContext(context);
  vm.runInContext(buildEditorPreviewHtmlSource, context);
  vm.runInContext('buildEditorDeckViewHtml = __buildEditorDeckViewHtml;', context);
  vm.runInContext('createEditorDeckViewHtmlOptions = __createEditorDeckViewHtmlOptions;', context);
  vm.runInContext('resolveDeckHtmlMethod = __resolveDeckHtmlMethod;', context);
  vm.runInContext('resolveStudioDeckViewMethod = __resolveStudioDeckViewMethod;', context);

  const result = context.buildEditorPreviewHtml(iframeDoc);

  assert.equal(result, '<html>preview-from-build-editor-deck-view-html</html>');
  assert.equal(delegatedBuildEditorDeckViewHtmlArgs.doc, iframeDoc);
  assert.equal(delegatedBuildEditorDeckViewHtmlArgs.options, previewDeckViewHtmlOptions);
  assert.equal(delegatedArgs.buildSharedHtml, buildStudioPreviewHtml);
  assert.equal(delegatedArgs.buildCanonicalHtml, buildDeckPreviewHtml);
  assert.deepEqual(
    JSON.parse(JSON.stringify(
      delegatedArgs.extendViewOptions({ activeSlideId: 'slide-1' })
    )),
    {
      activeSlideId: 'slide-1',
      presentationUrl: context.currentPresentationUrl
    }
  );
  assert.deepEqual(
    JSON.parse(JSON.stringify(
      delegatedArgs.mapCanonicalHtmlArgs(canonicalDeck, deckHtmlOptions)
    )),
    [
      canonicalDeck,
      context.currentPresentationUrl,
      deckHtmlOptions
    ]
  );
  assert.equal(
    delegatedArgs.transformFallbackHtml('<html>fallback</html>', deckHtmlOptions),
    '<html data-base="/presentations/demo/index.html#preview"><html>fallback</html></html>'
  );
  assert.deepEqual(calls, [
    ['buildPresentationBaseHref', '/presentations/demo/index.html', deckHtmlOptions],
    ['injectBaseHrefIntoHtml', '<html>fallback</html>', '/presentations/demo/index.html#preview']
  ]);
});

test('createEditorCanonicalDeckViewStateOptions reuses provided canonical and live-active resolvers when available', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const helperSource = extractFunctionSource(
    fileContent,
    'function createEditorCanonicalDeckViewStateOptions(options = {}) {',
    '\n\n    function resolveEditorCanonicalDeckViewState(doc = getIframeDoc(), options = {}) {'
  );

  const canonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: []
  };
  const customBuildCanonicalDeck = () => canonicalDeck;
  const customResolveLiveActiveSlideId = () => 'slide-live';
  const context = {};

  vm.createContext(context);
  vm.runInContext(helperSource, context);

  const options = context.createEditorCanonicalDeckViewStateOptions({
    buildCanonicalDeck: customBuildCanonicalDeck,
    resolveLiveActiveSlideId: customResolveLiveActiveSlideId
  });

  assert.equal(options.buildCanonicalDeck, customBuildCanonicalDeck);
  assert.equal(options.resolveLiveActiveSlideId, customResolveLiveActiveSlideId);
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
  const helperCalls = [];
  const context = {
    SlideNextStudioDeckSnapshot: {
      createStudioDeckSnapshotBuildOptions(nextDoc, options) {
        delegatedArgs = {
          nextDoc,
          options,
          canonicalDeck: options.buildCanonicalDeck(nextDoc),
          liveActiveSlideId: options.resolveLiveActiveSlideId(nextDoc),
          fallbackActiveSlideId: options.resolveFallbackActiveSlideId(nextDoc, canonicalDeck),
          liveActiveSlide: iframeDoc.querySelector('.slide-active')
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
    createEditorCanonicalDeckViewStateOptions() {
      helperCalls.push('createEditorCanonicalDeckViewStateOptions');
      return {
        buildCanonicalDeck(nextDoc) {
          assert.equal(nextDoc, iframeDoc);
          return canonicalDeck;
        },
        resolveLiveActiveSlideId(nextDoc) {
          assert.equal(nextDoc, iframeDoc);
          return 'slide-live';
        }
      };
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
  assert.deepEqual(helperCalls, ['createEditorCanonicalDeckViewStateOptions']);
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
    getActiveSlide(nextDoc) {
      assert.equal(nextDoc, iframeDoc);
      return activeSlide;
    },
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
  loadResolveEditorFallbackCanonicalDeck(fileContent, context);
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
    SlideNextStudioEditorPersistence: {
      resolveStudioCanonicalDeckOverride(options) {
        const hasValidCanonicalDeck = options.isCanonicalDeck
          ? options.isCanonicalDeck(options.canonicalDeck)
          : !!(options.canonicalDeck && Array.isArray(options.canonicalDeck.slides));
        return hasValidCanonicalDeck
          ? options.canonicalDeck
          : options.buildCanonicalDeck();
      }
    },
    buildEditorCanonicalDeck(nextDoc) {
      buildEditorCanonicalDeckCalls += 1;
      assert.equal(nextDoc, iframeDoc);
      return canonicalDeck;
    },
    createEditorPersistableCanonicalDeckOverrideResolver(nextDoc, nextCanonicalDeck) {
      return (shouldBuildFallbackCanonicalDeck = false) => context.resolveEditorCanonicalDeckOverride(nextCanonicalDeck, {
        buildCanonicalDeck: shouldBuildFallbackCanonicalDeck
          ? () => context.buildEditorCanonicalDeck(nextDoc)
          : null
      });
    },
    buildEditorDeckSnapshotFromDom() {},
    buildEditorLayerSnapshot() {},
    currentSlideIndex: 1,
    getActiveSlide(nextDoc) {
      assert.equal(nextDoc, iframeDoc);
      return null;
    },
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
  loadResolveEditorFallbackCanonicalDeck(fileContent, context);
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
