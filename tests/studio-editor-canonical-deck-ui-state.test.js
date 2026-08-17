const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const canonicalDeckModel = require('../shared/canonical-deck.js');
const canonicalDeckBuilder = require('../shared/studio-editor-canonical-deck.js');
const canonicalBridge = require('../shared/studio-editor-canonical-bridge.js');
const canonicalPersistenceAdapter = require('../shared/studio-editor-canonical-persistence-adapter.js');
const editorPersistence = require('../shared/studio-editor-persistence.js');
const editorPersistenceState = require('../shared/studio-editor-persistence-state.js');
const editorPreviewController = require('../shared/studio-editor-preview-controller.js');
const canonicalViewState = require('../shared/studio-editor-canonical-view-state.js');
const deckView = require('../shared/studio-deck-view.js');
const deckViewBuildOptions = require('../shared/studio-editor-deck-view-build-options.js');
const persistedStateFixture = require('./helpers/studio-persisted-state-fixture.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

function extractFunctionSource(fileContent, startMarker, endMarker) {
  const source = persistedStateFixture.extractPersistedStateAwareFunctionSource(
    fileContent,
    startMarker,
    endMarker
  );
  assert.notEqual(source, null, `Missing function markers: ${startMarker}`);
  return source;
}

function installSlideIndexAccessor(context) {
  context.getStudioCurrentSlideIndex = () => context.currentSlideIndex;
}

function installCanonicalPersistenceAdapter(context, force = false) {
  if (!force && Object.prototype.hasOwnProperty.call(context, 'studioEditorCanonicalPersistenceAdapter')) {
    return;
  }
  const persistenceApi = context.SlideNextStudioEditorPersistence || null;
  const persistenceStateApi = context.SlideNextStudioEditorPersistenceState || null;
  const canResolveValidator = !!persistenceStateApi
    || !!(persistenceApi
      && (typeof persistenceApi.resolveStudioCanonicalDeckOverride === 'function'
        || typeof persistenceApi.createStudioFallbackCanonicalDeckResolver === 'function'));
  context.studioEditorCanonicalPersistenceAdapter = canonicalPersistenceAdapter
    .createStudioEditorCanonicalPersistenceAdapter({
      getPersistenceController: () => context.studioEditorPersistenceController || null,
      persistenceApi,
      persistenceStateApi,
      isCanonicalDeck: canResolveValidator
        && typeof context.getEditorCanonicalDeckValidator === 'function'
        ? context.getEditorCanonicalDeckValidator()
        : canResolveValidator
          && context.SlideNextCanonicalDeck
          && typeof context.SlideNextCanonicalDeck.isCanonicalDeck === 'function'
            ? context.SlideNextCanonicalDeck.isCanonicalDeck
            : null,
      resolveCanonicalDeckOverrideForFallback:
        typeof context.resolveEditorCanonicalDeckOverride === 'function'
          ? context.resolveEditorCanonicalDeckOverride
          : null,
      buildCanonicalDeckForDocument: (doc) => typeof context.buildEditorCanonicalDeck === 'function'
        ? context.buildEditorCanonicalDeck(doc)
        : null
    });
}

function runEditorContext(source, context) {
  if (source.includes('studioEditorCanonicalPersistenceAdapter')) {
    installCanonicalPersistenceAdapter(context);
  }
  return vm.runInContext(source, context);
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
  if (!Object.prototype.hasOwnProperty.call(context, 'studioEditorCanonicalDeckBuilder')) {
    const deckContext = context.SlideNextStudioDeckContext || {};
    const deckLoader = context.SlideNextDeckLoader || {};
    const isCanonicalDeck = context.SlideNextCanonicalDeck
      && typeof context.SlideNextCanonicalDeck.isCanonicalDeck === 'function'
      ? context.SlideNextCanonicalDeck.isCanonicalDeck
      : (value) => !!value && Array.isArray(value.slides);
    context.studioEditorCanonicalDeckBuilder = canonicalDeckBuilder.createStudioCanonicalDeckBuilder({
      isCanonicalDeck,
      getCurrentPresentationMetadata: () => context.currentPresentationMetadata,
      getPersistedCanonicalDeck: () => context.lastPersistedCanonicalDeck,
      resolveLiveCanonicalDeck: (doc, options) => typeof context.resolveEditorLiveCanonicalDeck === 'function'
        ? context.resolveEditorLiveCanonicalDeck(doc, options)
        : null,
      resolveStoredCanonicalBaseline: (options) => typeof context.resolveEditorStoredCanonicalBaseline === 'function'
        ? context.resolveEditorStoredCanonicalBaseline(options)
        : typeof deckContext.resolveStudioCanonicalBaseline === 'function'
          ? deckContext.resolveStudioCanonicalBaseline(options)
          : null,
      buildPresentationMetadataSeed: context.buildCurrentPresentationMetadataSeed,
      getPresentationUrl: () => context.currentPresentationUrl,
      getPresentationTitle: () => context.currentTitle,
      buildStudioCanonicalDeck: typeof deckContext.buildStudioCanonicalDeck === 'function'
        ? (doc, options) => deckContext.buildStudioCanonicalDeck(doc, options)
        : null,
      buildCanonicalDeckFromDocument: typeof deckLoader.buildCanonicalDeckFromDocument === 'function'
        ? (doc, options) => deckLoader.buildCanonicalDeckFromDocument(doc, options)
        : null,
      getSlideId: context.getEditorSlideId,
      getNodeId: context.assignEditorElementId
    });
  }
  context.studioEditorCanonicalBridge = canonicalBridge.createStudioEditorCanonicalBridge({
    canonicalDeckBuilder: context.studioEditorCanonicalDeckBuilder,
    getDocument: context.getIframeDoc
  });
  runEditorContext(helperSource, context);
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
  runEditorContext(helperSource, context);
}

function loadCreateEditorDeckViewSharedOptions(fileContent, context) {
  installSlideIndexAccessor(context);
  if (typeof context.resolveEditorCanonicalDeckOverride !== 'function') {
    const resolveEditorCanonicalDeckOverrideSource = extractFunctionSource(
      fileContent,
      'function resolveEditorCanonicalDeckOverride(canonicalDeck = null, options = {}) {',
      '\n\n    function getEditorCanonicalDeckValidator() {'
    );
    runEditorContext(resolveEditorCanonicalDeckOverrideSource, context);
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
  installCanonicalPersistenceAdapter(context, true);
}

function loadResolveEditorFallbackCanonicalDeck(fileContent, context) {
  context.SlideNextStudioEditorPersistence = {
    ...editorPersistence,
    ...(context.SlideNextStudioEditorPersistence || {})
  };
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
      resolveStudioCanonicalBaseline(options) {
        calls.push(options.currentPresentationMetadata);
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
  assert.deepEqual(calls, [context.currentPresentationMetadata]);
});

test('resolveEditorStoredCanonicalDeck fails closed when the deck context helper is unavailable', () => {
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
    SlideNextStudioDeckContext: {}
  };

  vm.createContext(context);
  loadResolveEditorStoredCanonicalDeck(fileContent, context);

  const result = context.resolveEditorStoredCanonicalDeck({
    id: 'onboarding-presentation',
    title: 'Project Onboarding',
    sourcePath: '/presentations/onboarding-presentation/index.html',
    canonicalDeck: rawStoredCanonicalDeck
  });

  assert.equal(result, null);
});

test('stored canonical resolvers fail closed when the deck context runtime is unavailable', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const context = {
    getStudioCurrentPresentationMetadata() {
      return null;
    },
    getStudioPersistedCanonicalDeck() {
      return null;
    }
  };

  vm.createContext(context);
  loadResolveEditorStoredCanonicalDeck(fileContent, context);
  loadResolveEditorStoredCanonicalBaseline(fileContent, context);

  assert.equal(context.resolveEditorStoredCanonicalDeck({}), null);
  assert.equal(context.resolveEditorStoredCanonicalBaseline(), null);
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
      resolveStudioCanonicalBaseline(options) {
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
  assert.equal(calls.length, 1);
  assert.equal(calls[0].currentPresentationMetadata, context.currentPresentationMetadata);
  assert.deepEqual(
    JSON.parse(JSON.stringify(calls[0])),
    {
      currentPresentationMetadata: context.currentPresentationMetadata,
      persistedCanonicalDeck
    }
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

test('buildEditorCanonicalDeck fails closed when the shared canonical builder is unavailable', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const buildEditorCanonicalDeckSource = extractFunctionSource(
    fileContent,
    'function buildEditorCanonicalDeck(doc = getIframeDoc()) {',
    '\n\n    function buildEditorDeckSnapshot(doc = getIframeDoc(), options = {}) {'
  );

  const doc = { label: 'iframe-doc' };
  const currentPresentationMetadata = {
    id: 'deck-1',
    title: 'Project Onboarding',
    sourcePath: '/presentations/onboarding-presentation/index.html'
  };
  const context = {
    studioEditorCanonicalDeckBuilder: null,
    SlideNextStudioDeckContext: {},
    SlideNextDeckLoader: {
      buildCanonicalDeckFromDocument() {
        throw new Error('buildCanonicalDeckFromDocument should remain owned by the shared canonical builder');
      }
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

  assert.equal(result, null);
});

test('buildEditorCanonicalDeck reuses the shared stored canonical baseline when the deck context builder is unavailable', () => {
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
      resolveStudioCanonicalBaseline(options) {
        calls.push(options.currentPresentationMetadata);
        return currentMetadataCanonicalDeck;
      }
    },
    currentPresentationMetadata: {
      id: 'deck-1',
      canonicalDeck: currentMetadataCanonicalDeck
    },
    lastPersistedCanonicalDeck: persistedCanonicalDeck,
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
  loadBuildEditorCanonicalDeck(fileContent, context, helperSource);

  const result = context.resolveEditorCanonicalDeckOverride(null, {
    buildCanonicalDeck: () => context.buildEditorCanonicalDeck(iframeDoc)
  });

  assert.equal(result, canonicalDeck);
  assert.equal(delegatedArgs.canonicalDeck, null);
  assert.equal(typeof delegatedArgs.buildCanonicalDeck, 'function');
  assert.equal(delegatedArgs.isCanonicalDeck, context.SlideNextCanonicalDeck.isCanonicalDeck);
});

test('resolveEditorCanonicalDeckOverride delegates through the editor persistence-state adapter', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const canonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: []
  };
  const isCanonicalDeck = (deck) => deck === canonicalDeck;
  const override = { id: 'override' };
  let delegatedOptions = null;
  const buildCanonicalDeck = () => canonicalDeck;
  const context = {
    SlideNextStudioEditorPersistence: {
      resolveStudioCanonicalDeckOverride(options) {
        delegatedOptions = options;
        return canonicalDeck;
      }
    },
    SlideNextStudioEditorPersistenceState: editorPersistenceState,
    getEditorCanonicalDeckValidator() {
      return isCanonicalDeck;
    }
  };
  const helperSource = extractFunctionSource(
    fileContent,
    'function resolveEditorCanonicalDeckOverride(canonicalDeck = null, options = {}) {',
    '\n\n    function getEditorCanonicalDeckValidator() {'
  );

  vm.createContext(context);
  runEditorContext(helperSource, context);

  assert.equal(
    context.resolveEditorCanonicalDeckOverride(override, { buildCanonicalDeck }),
    canonicalDeck
  );
  assert.equal(delegatedOptions.canonicalDeck, override);
  assert.equal(delegatedOptions.buildCanonicalDeck, buildCanonicalDeck);
  assert.equal(delegatedOptions.isCanonicalDeck, isCanonicalDeck);
});

test('resolveEditorCanonicalDeckOverride creates the shared canonical override adapter once', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const helperSource = extractFunctionSource(
    fileContent,
    'function resolveEditorCanonicalDeckOverride(canonicalDeck = null, options = {}) {',
    '\n\n    function getEditorCanonicalDeckValidator() {'
  );
  let adapterCreateCalls = 0;
  const context = {
    SlideNextStudioEditorPersistence: {},
    SlideNextStudioEditorPersistenceState: {
      createStudioEditorCanonicalDeckOverrideAdapter(options) {
        adapterCreateCalls += 1;
        return (canonicalDeck, nextOptions) => ({
          canonicalDeck,
          marker: nextOptions.marker,
          isCanonicalDeck: options.isCanonicalDeck
        });
      }
    },
    getEditorCanonicalDeckValidator() {
      return 'canonical-validator';
    }
  };

  vm.createContext(context);
  runEditorContext(helperSource, context);

  const firstResult = context.resolveEditorCanonicalDeckOverride({ id: 'one' }, { marker: 1 });
  const secondResult = context.resolveEditorCanonicalDeckOverride({ id: 'two' }, { marker: 2 });

  assert.equal(adapterCreateCalls, 1);
  assert.equal(firstResult.canonicalDeck.id, 'one');
  assert.equal(firstResult.marker, 1);
  assert.equal(firstResult.isCanonicalDeck, 'canonical-validator');
  assert.equal(secondResult.canonicalDeck.id, 'two');
  assert.equal(secondResult.marker, 2);
});

test('resolveEditorCanonicalDeckOverride returns null when the persistence runtime is unavailable', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const helperSource = extractFunctionSource(
    fileContent,
    'function resolveEditorCanonicalDeckOverride(canonicalDeck = null, options = {}) {',
    '\n\n    function getEditorCanonicalDeckValidator() {'
  );
  const context = {
    getEditorCanonicalDeckValidator() {
      return null;
    }
  };

  vm.createContext(context);
  runEditorContext(helperSource, context);

  assert.equal(
    context.resolveEditorCanonicalDeckOverride({ id: 'override' }, {
      buildCanonicalDeck: () => ({ kind: 'slidenext.deck', schemaVersion: 1, slides: [] })
    }),
    null
  );
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
  runEditorContext(helperSource, context);

  assert.equal(
    context.getEditorCanonicalDeckValidator(),
    context.SlideNextCanonicalDeck.isCanonicalDeck
  );
});

test('createEditorDeckViewSharedOptions reuses the shared deck canonical override selector and validator when available', () => {
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
    SlideNextStudioDeckView: {
      createStudioDeckViewSharedOptions: deckView.createStudioDeckViewSharedOptions
    },
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
  installSlideIndexAccessor(context);

  vm.createContext(context);
  runEditorContext(helperSource, context);

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

test('createEditorDeckViewSharedOptions delegates shared option composition through the shared deck view helper when available', () => {
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
  let delegatedArgs = null;
  const context = {
    SlideNextStudioDeckView: {
      createStudioDeckViewSharedOptions(nextDoc, options = {}) {
        delegatedArgs = {
          nextDoc,
          currentSlideIndex: options.currentSlideIndex,
          hasGetPersistedActiveSlideId: typeof options.getPersistedActiveSlideId === 'function',
          hasBuildCanonicalDeck: typeof options.buildCanonicalDeck === 'function',
          resolveCanonicalDeckOverride: options.resolveCanonicalDeckOverride,
          resolveLiveActiveSlideId: options.resolveLiveActiveSlideId,
          isCanonicalDeck: options.isCanonicalDeck
        };
        return {
          currentSlideIndex: options.currentSlideIndex,
          getPersistedActiveSlideId: options.getPersistedActiveSlideId,
          resolveCanonicalDeck: options.buildCanonicalDeck,
          resolveCanonicalDeckOverride(canonicalDeckToResolve, nextOverrideDoc) {
            return options.resolveCanonicalDeckOverride(canonicalDeckToResolve, {
              buildCanonicalDeck: canonicalDeckToResolve
                ? () => options.buildCanonicalDeck(nextOverrideDoc)
                : null
            });
          },
          resolveLiveActiveSlideId: options.resolveLiveActiveSlideId,
          isCanonicalDeck: options.isCanonicalDeck
        };
      }
    },
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
    }
  };
  installSlideIndexAccessor(context);

  vm.createContext(context);
  runEditorContext(helperSource, context);

  const options = context.createEditorDeckViewSharedOptions(iframeDoc);

  assert.equal(options.currentSlideIndex, 2);
  assert.equal(options.getPersistedActiveSlideId, context.getPersistedActiveSlideId);
  assert.equal(options.resolveCanonicalDeck(iframeDoc), canonicalDeck);
  assert.equal(options.resolveCanonicalDeckOverride(canonicalDeck, iframeDoc), canonicalDeck);
  assert.equal(options.resolveLiveActiveSlideId(iframeDoc), 'slide-live');
  assert.equal(options.isCanonicalDeck, isCanonicalDeck);
  assert.deepEqual(helperCalls, ['createEditorCanonicalDeckViewStateOptions']);
  assert.deepEqual(delegatedArgs, {
    nextDoc: iframeDoc,
    currentSlideIndex: 2,
    hasGetPersistedActiveSlideId: true,
    hasBuildCanonicalDeck: true,
    resolveCanonicalDeckOverride: context.resolveEditorCanonicalDeckOverride,
    resolveLiveActiveSlideId: delegatedArgs.resolveLiveActiveSlideId,
    isCanonicalDeck
  });
  assert.equal(typeof delegatedArgs.resolveLiveActiveSlideId, 'function');
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

test('resolveEditorFallbackCanonicalDeck uses shared fallback resolution with the local deck override resolver', () => {
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
    SlideNextStudioEditorPersistence: editorPersistence,
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
  runEditorContext(helperSource, context);

  const result = context.resolveEditorFallbackCanonicalDeck(iframeDoc, malformedCanonicalDeck);

  assert.equal(result, rebuiltCanonicalDeck);
  assert.equal(calls.length, 4);
  assert.equal(calls[0][0], 'getEditorCanonicalDeckValidator');
  assert.equal(calls[1][0], 'resolveEditorCanonicalDeckOverride');
  assert.equal(calls[1][1], malformedCanonicalDeck);
  assert.equal(typeof calls[1][2], 'function');
  assert.deepEqual(calls.slice(2), [
    ['isCanonicalDeck', malformedCanonicalDeck],
    ['buildEditorCanonicalDeck', iframeDoc]
  ]);
});

test('resolveEditorFallbackCanonicalDeck rebuilds malformed canonical deck input through shared fallback resolution', () => {
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
    SlideNextStudioEditorPersistence: editorPersistence,
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
  runEditorContext(helperSource, context);

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

test('resolveEditorFallbackCanonicalDeck fails closed when the shared helper is unavailable', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const helperSource = extractFunctionSource(
    fileContent,
    'function resolveEditorFallbackCanonicalDeck(doc = getIframeDoc(), canonicalDeck = null) {',
    '\n\n    function getPersistedActiveSlideId(playbackState = persistedDeckPlaybackState) {'
  );
  const context = {
    buildEditorCanonicalDeck() {
      throw new Error('page-local canonical fallback should not run');
    },
    resolveEditorCanonicalDeckOverride() {
      throw new Error('page-local canonical override should not run');
    },
    getEditorCanonicalDeckValidator() {
      throw new Error('page-local canonical validation should not run');
    }
  };

  vm.createContext(context);
  runEditorContext(helperSource, context);

  assert.equal(
    context.resolveEditorFallbackCanonicalDeck(null, {
      metadata: {
        title: 'Broken Deck'
      }
    }),
    null
  );
});

test('resolveEditorFallbackCanonicalDeck fails closed when only the legacy shared fallback helper is available', () => {
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
  const context = {
    SlideNextStudioEditorPersistence: {
      resolveStudioFallbackCanonicalDeck() {
        throw new Error('legacy fallback helper should not run');
      }
    },
    buildEditorCanonicalDeck() {
      throw new Error('buildEditorCanonicalDeck should not run without the shared fallback builder');
    },
    getEditorCanonicalDeckValidator() {
      throw new Error('canonical validator should not run without the shared fallback builder');
    },
    getIframeDoc() {
      return iframeDoc;
    },
    resolveEditorCanonicalDeckOverride() {
      throw new Error('canonical override should not run without the shared fallback builder');
    }
  };

  vm.createContext(context);
  runEditorContext(helperSource, context);

  const result = context.resolveEditorFallbackCanonicalDeck(iframeDoc, malformedCanonicalDeck);

  assert.equal(result, null);
});

test('resolveEditorFallbackCanonicalDeck reuses the shared fallback deck resolver builder when available', () => {
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
      createStudioFallbackCanonicalDeckResolver(options = {}) {
        helperCall = {
          hasBuildCanonicalDeck: typeof options.buildCanonicalDeck === 'function',
          hasResolveCanonicalDeckOverride: typeof options.resolveCanonicalDeckOverride === 'function',
          isCanonicalDeck: options.isCanonicalDeck
        };
        return (nextCanonicalDeck) => {
          helperCall.nextCanonicalDeck = nextCanonicalDeck;
          return resolvedCanonicalDeck;
        };
      }
    },
    buildEditorCanonicalDeck() {
      throw new Error('buildEditorCanonicalDeck should be delegated through the shared fallback builder');
    },
    getEditorCanonicalDeckValidator() {
      return isCanonicalDeck;
    },
    getIframeDoc() {
      return iframeDoc;
    },
    resolveEditorCanonicalDeckOverride() {
      throw new Error('resolveEditorCanonicalDeckOverride should be delegated through the shared fallback builder');
    }
  };

  vm.createContext(context);
  runEditorContext(helperSource, context);

  const result = context.resolveEditorFallbackCanonicalDeck(iframeDoc, malformedCanonicalDeck);

  assert.equal(result, resolvedCanonicalDeck);
  assert.deepEqual(helperCall, {
    hasBuildCanonicalDeck: true,
    hasResolveCanonicalDeckOverride: true,
    isCanonicalDeck,
    nextCanonicalDeck: malformedCanonicalDeck
  });
});

test('resolveEditorFallbackCanonicalDeck delegates through the editor persistence-state adapter', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const iframeDoc = { label: 'iframe-doc' };
  const malformedCanonicalDeck = { metadata: { title: 'Broken Deck' } };
  const resolvedCanonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: [{ id: 'slide-1', nodes: [] }]
  };
  const isCanonicalDeck = (deck) => deck === resolvedCanonicalDeck;
  let helperCall = null;
  const context = {
    SlideNextStudioEditorPersistence: {
      createStudioFallbackCanonicalDeckResolver(options = {}) {
        helperCall = {
          hasBuildCanonicalDeck: typeof options.buildCanonicalDeck === 'function',
          hasResolveCanonicalDeckOverride: typeof options.resolveCanonicalDeckOverride === 'function',
          isCanonicalDeck: options.isCanonicalDeck
        };
        return (nextCanonicalDeck) => {
          helperCall.nextCanonicalDeck = nextCanonicalDeck;
          return resolvedCanonicalDeck;
        };
      }
    },
    SlideNextStudioEditorPersistenceState: editorPersistenceState,
    buildEditorCanonicalDeck() {
      throw new Error('buildEditorCanonicalDeck should remain deferred to the shared adapter');
    },
    getEditorCanonicalDeckValidator() {
      return isCanonicalDeck;
    },
    resolveEditorCanonicalDeckOverride() {
      throw new Error('resolveEditorCanonicalDeckOverride should be delegated through the shared adapter');
    }
  };
  const helperSource = extractFunctionSource(
    fileContent,
    'function resolveEditorFallbackCanonicalDeck(doc = getIframeDoc(), canonicalDeck = null) {',
    '\n\n    function getPersistedActiveSlideId(playbackState = persistedDeckPlaybackState) {'
  );

  vm.createContext(context);
  runEditorContext(helperSource, context);

  assert.equal(
    context.resolveEditorFallbackCanonicalDeck(iframeDoc, malformedCanonicalDeck),
    resolvedCanonicalDeck
  );
  assert.deepEqual(helperCall, {
    hasBuildCanonicalDeck: true,
    hasResolveCanonicalDeckOverride: true,
    isCanonicalDeck,
    nextCanonicalDeck: malformedCanonicalDeck
  });
});

test('resolveEditorFallbackCanonicalDeck reuses the adapter without stale document closures', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const firstDoc = { id: 'doc-one' };
  const secondDoc = { id: 'doc-two' };
  let adapterCreateCalls = 0;
  const buildCalls = [];
  const context = {
    SlideNextStudioEditorPersistence: {
      createStudioFallbackCanonicalDeckResolver(options = {}) {
        return (canonicalDeck) => canonicalDeck && options.buildCanonicalDeck
          ? options.buildCanonicalDeck()
          : canonicalDeck;
      }
    },
    SlideNextStudioEditorPersistenceState: {
      createStudioEditorFallbackCanonicalDeckAdapter(options) {
        adapterCreateCalls += 1;
        return editorPersistenceState.createStudioEditorFallbackCanonicalDeckAdapter(options);
      }
    },
    buildEditorCanonicalDeck(doc) {
      buildCalls.push(doc);
      return { id: doc.id, slides: [] };
    },
    getEditorCanonicalDeckValidator() {
      return () => true;
    },
    resolveEditorCanonicalDeckOverride() {
      return null;
    }
  };
  const helperSource = extractFunctionSource(
    fileContent,
    'function resolveEditorFallbackCanonicalDeck(doc = getIframeDoc(), canonicalDeck = null) {',
    '\n\n    function getPersistedActiveSlideId(playbackState = persistedDeckPlaybackState) {'
  );

  vm.createContext(context);
  runEditorContext(helperSource, context);

  assert.deepEqual(
    context.resolveEditorFallbackCanonicalDeck(firstDoc, { id: 'malformed-one' }),
    { id: 'doc-one', slides: [] }
  );
  assert.deepEqual(
    context.resolveEditorFallbackCanonicalDeck(secondDoc, { id: 'malformed-two' }),
    { id: 'doc-two', slides: [] }
  );
  assert.equal(adapterCreateCalls, 1);
  assert.deepEqual(buildCalls, [firstDoc, secondDoc]);
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
      createStudioDeckViewSharedOptions: deckView.createStudioDeckViewSharedOptions,
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
      createStudioDeckViewSharedOptions: deckView.createStudioDeckViewSharedOptions,
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
  runEditorContext(resolveEditorCanonicalDeckOverrideSource, context);
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

test('resolveEditorFallbackActiveSlideId fails closed when the shared deck view helper is unavailable', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const resolveEditorFallbackActiveSlideIdSource = extractFunctionSource(
    fileContent,
    'function resolveEditorFallbackActiveSlideId(doc = getIframeDoc(), canonicalDeck = null) {',
    '\n\n    function buildEditorPreviewHtml(doc = getIframeDoc()) {'
  );

  const iframeDoc = { label: 'iframe-doc' };
  const context = {
    getIframeDoc() {
      return iframeDoc;
    }
  };

  vm.createContext(context);
  loadResolveEditorFallbackCanonicalDeck(fileContent, context);
  vm.runInContext(resolveEditorFallbackActiveSlideIdSource, context);

  const result = context.resolveEditorFallbackActiveSlideId(iframeDoc, null);

  assert.equal(result, '');
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
    SlideNextStudioEditorCanonicalViewState: canonicalViewState,
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

test('resolveEditorLiveActiveSlide delegates to the shared editor DOM active slide helper', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const resolveEditorLiveActiveSlideSource = extractFunctionSource(
    fileContent,
    'function resolveEditorLiveActiveSlide(doc = getIframeDoc()) {',
    '\n\n    function buildEditorDeckRenderOptions(doc = getIframeDoc(), canonicalDeck = null, options = {}) {'
  );

  const iframeDoc = {
    label: 'iframe-doc',
    querySelector() {
      throw new Error('querySelector should not run when the shared helper is available');
    }
  };
  const activeSlide = { id: 'slide-active-el' };
  const context = {
    SlideNextStudioEditorCanonicalViewState: canonicalViewState,
    SlideNextStudioDeckView: {
      resolveStudioLiveActiveSlide(nextDoc) {
        assert.equal(nextDoc, iframeDoc);
        return activeSlide;
      }
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

test('getPersistedActiveSlideId returns an empty id when the shared editor reader is unavailable', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const getPersistedActiveSlideIdSource = extractFunctionSource(
    fileContent,
    'function getPersistedActiveSlideId(playbackState = persistedDeckPlaybackState) {',
    '\n\n    function getCurrentEditorPersistedDeckState() {'
  );

  const context = {
    SlideNextDeckPersistence: {
      resolvePersistedDeckActiveSlideId(playbackState) {
        return 'slide-shared';
      }
    },
    SlideNextStudioEditorPersistence: {},
    persistedDeckPlaybackState: {
      activeSlideIds: ['slide-2'],
      slideCounterText: '2 / 4'
    }
  };

  vm.createContext(context);
  vm.runInContext(getPersistedActiveSlideIdSource, context);

  const result = context.getPersistedActiveSlideId();

  assert.equal(result, '');
});

test('getPersistedActiveSlideId reuses the shared editor persistence helper when available', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const getPersistedActiveSlideIdSource = extractFunctionSource(
    fileContent,
    'function getPersistedActiveSlideId(playbackState = persistedDeckPlaybackState) {',
    '\n\n    function getCurrentEditorPersistedDeckState() {'
  );

  let delegatedArgs = null;
  let readerCreateCalls = 0;
  const context = {
    SlideNextDeckPersistence: {
      resolvePersistedDeckActiveSlideId() {
        throw new Error('resolvePersistedDeckActiveSlideId should be delegated through the shared editor helper');
      }
    },
    SlideNextStudioEditorPersistence: {
      createStudioPersistedActiveSlideIdReader(options = {}) {
        readerCreateCalls += 1;
        delegatedArgs = options;
        return (playbackState) => playbackState && playbackState.activeSlideIds
          ? playbackState.activeSlideIds[0]
          : '';
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
  const explicitResult = context.getPersistedActiveSlideId({ activeSlideIds: ['slide-3'] });

  assert.equal(result, 'slide-2');
  assert.equal(explicitResult, 'slide-3');
  assert.equal(readerCreateCalls, 1);
  assert.equal(typeof delegatedArgs.getPlaybackState, 'function');
  assert.equal(delegatedArgs.resolvePersistedDeckActiveSlideId, context.SlideNextDeckPersistence.resolvePersistedDeckActiveSlideId);
});

test('getPersistedActiveSlideId delegates through the editor persistence-state adapter', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  let delegatedArgs = null;
  let readerCreateCalls = 0;
  const context = {
    SlideNextDeckPersistence: {
      resolvePersistedDeckActiveSlideId() {
        return 'legacy-reader';
      }
    },
    SlideNextStudioEditorPersistence: {
      createStudioPersistedActiveSlideIdReader(options = {}) {
        readerCreateCalls += 1;
        delegatedArgs = options;
        return (playbackState) => playbackState && playbackState.activeSlideIds
          ? playbackState.activeSlideIds[0]
          : '';
      }
    },
    SlideNextStudioEditorPersistenceState: editorPersistenceState,
    persistedDeckPlaybackState: {
      activeSlideIds: ['slide-2'],
      slideCounterText: '2 / 4'
    }
  };

  const getPersistedActiveSlideIdSource = extractFunctionSource(
    fileContent,
    'function getPersistedActiveSlideId(playbackState = persistedDeckPlaybackState) {',
    '\n\n    function getCurrentEditorPersistedDeckState() {'
  );
  vm.createContext(context);
  vm.runInContext(getPersistedActiveSlideIdSource, context);

  assert.equal(context.getPersistedActiveSlideId(), 'slide-2');
  assert.equal(context.getPersistedActiveSlideId({ activeSlideIds: ['slide-3'] }), 'slide-3');
  assert.equal(readerCreateCalls, 1);
  assert.equal(typeof delegatedArgs.getPlaybackState, 'function');
  assert.equal(delegatedArgs.resolvePersistedDeckActiveSlideId, null);
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
    SlideNextStudioEditorCanonicalViewState: canonicalViewState,
    SlideNextStudioDeckView: deckView,
    buildEditorCanonicalDeck(nextDoc) {
      calls.push(['buildEditorCanonicalDeck', nextDoc]);
      return canonicalDeck;
    },
    getIframeDoc() {
      return iframeDoc;
    }
  };

  vm.createContext(context);
  runEditorContext(helperSource, context);

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

test('createEditorCanonicalDeckResolverWithBuilder fails closed when the shared helper is unavailable', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const helperSource = extractFunctionSource(
    fileContent,
    'function createEditorCanonicalDeckResolverWithBuilder(\n      doc = getIframeDoc(),\n      buildCanonicalDeck = (sourceDoc) => buildEditorCanonicalDeck(sourceDoc)\n    ) {',
    '\n\n    function createEditorCanonicalDeckViewStateOptions(options = {}) {'
  );
  let buildCalls = 0;
  const context = {};

  vm.createContext(context);
  runEditorContext(helperSource, context);

  const resolveCanonicalDeck = context.createEditorCanonicalDeckResolverWithBuilder(
    { label: 'iframe-doc' },
    () => {
      buildCalls += 1;
      return { kind: 'slidenext.deck', slides: [] };
    }
  );

  assert.equal(resolveCanonicalDeck(), null);
  assert.equal(buildCalls, 0);
});

test('createEditorCanonicalDeckResolverWithBuilder reuses the shared canonical resolver when available', () => {
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
    SlideNextStudioEditorCanonicalViewState: canonicalViewState,
    SlideNextStudioDeckView: {
      createStudioCanonicalDeckResolver(nextDoc, options) {
        calls.push(['createStudioCanonicalDeckResolver', nextDoc, options.buildCanonicalDeck]);
        return () => canonicalDeck;
      }
    }
  };
  const buildCanonicalDeck = () => canonicalDeck;

  vm.createContext(context);
  runEditorContext(helperSource, context);

  const resolveCanonicalDeck = context.createEditorCanonicalDeckResolverWithBuilder(
    iframeDoc,
    buildCanonicalDeck
  );

  assert.equal(resolveCanonicalDeck(), canonicalDeck);
  assert.deepEqual(calls, [
    ['createStudioCanonicalDeckResolver', iframeDoc, buildCanonicalDeck]
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
    SlideNextStudioDeckView: deckView,
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

test('resolveEditorCanonicalDeckViewState fails closed when the shared deck view helper is unavailable', () => {
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

  assert.equal(result.liveActiveSlideId, '');
  assert.equal(result.resolveCanonicalDeck(), null);
  assert.equal(result.resolvedCanonicalDeck, null);
  assert.deepEqual(calls, []);
});

test('resolveEditorCanonicalDeckViewState does not use the snapshot helper as a fallback', () => {
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

  assert.equal(delegatedArgs, null);
  assert.equal(result.resolveCanonicalDeck(), null);
  assert.equal(result.resolvedCanonicalDeck, null);
});

test('resolveEditorCanonicalDeckViewState keeps the local resolver builder unused when shared resolvers are unavailable', () => {
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
  assert.equal(result.resolveCanonicalDeck(), null);
  assert.equal(result.resolvedCanonicalDeck, null);
  assert.deepEqual(calls, [
    ['createEditorCanonicalDeckViewStateOptions']
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
    SlideNextStudioEditorDeckViewBuildOptions: deckViewBuildOptions,
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
    SlideNextStudioEditorDeckViewBuildOptions: deckViewBuildOptions,
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
    SlideNextStudioEditorDeckViewBuildOptions: deckViewBuildOptions,
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
    SlideNextStudioEditorCanonicalViewState: canonicalViewState,
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
    SlideNextStudioEditorCanonicalViewState: canonicalViewState,
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

test('buildEditorDeckRenderOptions fails closed when the shared deck view helper is unavailable', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const buildEditorDeckRenderOptionsSource = extractFunctionSource(
    fileContent,
    'function buildEditorDeckRenderOptions(doc = getIframeDoc(), canonicalDeck = null, options = {}) {',
    '\n\n    function createEditorCanonicalDeckResolverWithBuilder(\n      doc = getIframeDoc(),\n      buildCanonicalDeck = (sourceDoc) => buildEditorCanonicalDeck(sourceDoc)\n    ) {'
  );
  const context = {
    SlideNextStudioDeckView: {},
    resolveEditorFallbackActiveSlideId() {
      throw new Error('resolveEditorFallbackActiveSlideId should remain owned by the shared deck view helper');
    },
    getIframeDoc() {
      return null;
    }
  };

  vm.createContext(context);
  vm.runInContext(buildEditorDeckRenderOptionsSource, context);

  assert.equal(context.buildEditorDeckRenderOptions(), null);
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
  const context = {
    SlideNextStudioDeckView: deckView
  };

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
    SlideNextStudioDeckView: deckView,
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
    studioEditorPreviewController: editorPreviewController.createStudioEditorPreviewController({}),
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
  runEditorContext(helperSource, context);

  const options = context.createEditorCanonicalDeckViewStateOptions({
    buildCanonicalDeck: customBuildCanonicalDeck,
    resolveLiveActiveSlideId: customResolveLiveActiveSlideId
  });

  assert.equal(options.buildCanonicalDeck, customBuildCanonicalDeck);
  assert.equal(options.resolveLiveActiveSlideId, customResolveLiveActiveSlideId);
});

test('createEditorCanonicalDeckViewStateOptions defaults to the live-first canonical resolver', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const helperSource = extractFunctionSource(
    fileContent,
    'function createEditorCanonicalDeckViewStateOptions(options = {}) {',
    '\n\n    function resolveEditorCanonicalDeckViewState(doc = getIframeDoc(), options = {}) {'
  );
  const documentRef = { id: 'iframe-document' };
  const canonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: []
  };
  const calls = [];
  const context = {
    resolveEditorUiCanonicalDeck(doc) {
      calls.push(['resolver', doc]);
      return canonicalDeck;
    },
    buildEditorCanonicalDeck() {
      throw new Error('default view-state reads should use live canonical data');
    },
    resolveEditorLiveActiveSlideId() {
      return 'slide-live';
    }
  };

  vm.createContext(context);
  runEditorContext(helperSource, context);

  const options = context.createEditorCanonicalDeckViewStateOptions({});
  assert.equal(options.buildCanonicalDeck(documentRef), canonicalDeck);
  assert.deepEqual(calls, [['resolver', documentRef]]);
});

test('createEditorCanonicalDeckViewStateOptions delegates callback normalization to the shared deck view helper', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const helperSource = extractFunctionSource(
    fileContent,
    'function createEditorCanonicalDeckViewStateOptions(options = {}) {',
    '\n\n    function resolveEditorCanonicalDeckViewState(doc = getIframeDoc(), options = {}) {'
  );
  const calls = [];
  const customBuildCanonicalDeck = () => ({ slides: [] });
  const customResolveLiveActiveSlideId = () => 'slide-live';
  const sharedOptions = {
    buildCanonicalDeck: customBuildCanonicalDeck,
    resolveLiveActiveSlideId: customResolveLiveActiveSlideId,
    source: 'shared'
  };
  const context = {
    SlideNextStudioDeckView: {
      createStudioDeckViewCanonicalStateOptions(options) {
        calls.push(options);
        return sharedOptions;
      }
    },
    buildEditorCanonicalDeck() {
      throw new Error('editor canonical fallback should not run');
    },
    resolveEditorLiveActiveSlideId() {
      throw new Error('editor active-slide fallback should not run');
    }
  };

  vm.createContext(context);
  runEditorContext(helperSource, context);

  assert.equal(context.createEditorCanonicalDeckViewStateOptions({
    buildCanonicalDeck: customBuildCanonicalDeck,
    resolveLiveActiveSlideId: customResolveLiveActiveSlideId
  }), sharedOptions);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].buildCanonicalDeck, customBuildCanonicalDeck);
  assert.equal(calls[0].resolveLiveActiveSlideId, customResolveLiveActiveSlideId);
});

test('createEditorCanonicalDeckViewStateOptions falls back when shared normalization is incomplete', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const helperSource = extractFunctionSource(
    fileContent,
    'function createEditorCanonicalDeckViewStateOptions(options = {}) {',
    '\n\n    function resolveEditorCanonicalDeckViewState(doc = getIframeDoc(), options = {}) {'
  );
  const customBuildCanonicalDeck = () => ({ slides: [] });
  const customResolveLiveActiveSlideId = () => 'slide-live';
  const context = {
    SlideNextStudioDeckView: {
      createStudioDeckViewCanonicalStateOptions() {
        return {};
      }
    },
    buildEditorCanonicalDeck() {
      throw new Error('editor canonical fallback should not run');
    },
    resolveEditorLiveActiveSlideId() {
      throw new Error('editor active-slide fallback should not run');
    }
  };

  vm.createContext(context);
  runEditorContext(helperSource, context);

  const options = context.createEditorCanonicalDeckViewStateOptions({
    buildCanonicalDeck: customBuildCanonicalDeck,
    resolveLiveActiveSlideId: customResolveLiveActiveSlideId
  });

  assert.equal(options.buildCanonicalDeck, customBuildCanonicalDeck);
  assert.equal(options.resolveLiveActiveSlideId, customResolveLiveActiveSlideId);
});

test('buildEditorDeckSnapshot fails closed when only the legacy snapshot builder is available', () => {
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
      createStudioDeckSnapshotBuildOptions() {
        throw new Error('legacy snapshot build-options helper should not run');
      },
      buildStudioDeckSnapshot(nextDoc, options) {
        throw new Error('legacy snapshot builder should not run');
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

  assert.equal(result, null);
  assert.deepEqual(helperCalls, []);
  assert.deepEqual(calls, []);
});

test('buildEditorDeckSnapshotFromDom fails closed when the shared DOM snapshot builder is unavailable', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const buildEditorDeckSnapshotFromDomSource = extractFunctionSource(
    fileContent,
    'function buildEditorDeckSnapshotFromDom(doc = getIframeDoc(), options = {}) {',
    '\n\n    function buildCurrentPresentationMetadataSeed('
  );
  const context = {
    SlideNextStudioDeckSnapshot: {},
    studioEditorDeckSnapshotController: null,
    getSlides() {
      throw new Error('DOM snapshot dependencies should not run');
    },
    getActiveSlide() {
      throw new Error('DOM snapshot dependencies should not run');
    },
    getEditorSlideId() {
      throw new Error('DOM snapshot dependencies should not run');
    },
    getSlideEditableElements() {
      throw new Error('DOM snapshot dependencies should not run');
    },
    getNormalizedSlideLayerOrder() {
      throw new Error('DOM snapshot dependencies should not run');
    },
    buildEditorElementSnapshot() {
      throw new Error('DOM snapshot dependencies should not run');
    }
  };

  vm.createContext(context);
  vm.runInContext(buildEditorDeckSnapshotFromDomSource, context);

  assert.equal(
    context.buildEditorDeckSnapshotFromDom({ label: 'iframe-doc' }),
    null
  );
});

test('getStudioActiveSlideIndex falls back to the current slide when the shared resolver is unavailable', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const getStudioActiveSlideIndexSource = extractFunctionSource(
    fileContent,
    'function getStudioActiveSlideIndex(doc = getIframeDoc()) {',
    '\n\n    function getEditorLayerDisplayMetadata(el) {'
  );
  const context = {
    SlideNextStudioDeckSnapshot: {},
    getStudioCurrentSlideIndex() {
      return 3;
    },
    buildEditorDeckSnapshot() {
      throw new Error('deck snapshot should not be built without an active-slide resolver');
    }
  };

  vm.createContext(context);
  vm.runInContext(getStudioActiveSlideIndexSource, context);

  assert.equal(
    context.getStudioActiveSlideIndex({ label: 'iframe-doc' }),
    3
  );
});

test('buildEditorElementSnapshot fails closed when shared accessors are unavailable', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const buildEditorElementSnapshotSource = extractFunctionSource(
    fileContent,
    'function buildEditorElementSnapshot(el) {',
    '\n\n    function buildEditorLayerSnapshot(slide) {'
  );
  const context = {
    SlideNextStudioElementSnapshot: {},
    assignEditorElementId() {
      throw new Error('element snapshot dependencies should not run');
    },
    isElementLocked() {
      throw new Error('element snapshot dependencies should not run');
    },
    isElementHidden() {
      throw new Error('element snapshot dependencies should not run');
    },
    getStudioSelectedElements() {
      throw new Error('element snapshot dependencies should not run');
    },
    SlideNextStudioEditorLiveSelection: {
      isStudioLiveSelectedElement() {
        throw new Error('element snapshot dependencies should not run');
      }
    }
  };

  vm.createContext(context);
  vm.runInContext(buildEditorElementSnapshotSource, context);

  assert.equal(context.buildEditorElementSnapshot({ label: 'element' }), null);
});

test('buildEditorElementSnapshot delegates through shared accessors', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const buildEditorElementSnapshotSource = extractFunctionSource(
    fileContent,
    'function buildEditorElementSnapshot(el) {',
    '\n\n    function buildEditorLayerSnapshot(slide) {'
  );
  let createCalls = 0;
  const builderCalls = [];
  const selectedElements = [{ id: 'selected' }];
  const context = {
    studioEditorElementSnapshotAccessors: {
      build(element) {
        builderCalls.push([
          element,
          `editor-${element.id}`,
          true,
          false,
          element.id === 'selected'
        ]);
        return { id: element.id };
      }
    },
    SlideNextStudioElementSnapshot: {
      createStudioEditorElementSnapshotBuilder(options) {
        createCalls += 1;
        return (element) => {
          builderCalls.push([
            element,
            options.getElementId(element),
            options.isElementLocked(element),
            options.isElementHidden(element),
            options.isSelectedElement(element)
          ]);
          return { id: element.id };
        };
      }
    },
    SlideNextStudioEditorLiveSelection: {
      isStudioLiveSelectedElement(elements, element) {
        return !!(element && element.id === 'selected');
      }
    },
    assignEditorElementId(element) {
      return `editor-${element.id}`;
    },
    isElementLocked() {
      return true;
    },
    isElementHidden() {
      return false;
    },
    getStudioSelectedElements() {
      return selectedElements;
    }
  };

  vm.createContext(context);
  vm.runInContext(buildEditorElementSnapshotSource, context);

  const firstElement = { id: 'first' };
  const secondElement = selectedElements[0];
  assert.deepEqual(context.buildEditorElementSnapshot(firstElement), { id: 'first' });
  assert.deepEqual(context.buildEditorElementSnapshot(secondElement), { id: 'selected' });
  assert.deepEqual(builderCalls, [
    [firstElement, 'editor-first', true, false, false],
    [secondElement, 'editor-selected', true, false, true]
  ]);
});

test('buildEditorElementSnapshot resolves selection through the candidate owner document', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const start = fileContent.indexOf('function buildEditorElementSnapshot(el) {');
  const end = fileContent.indexOf('\n\n    function buildEditorLayerSnapshot(slide) {', start);
  assert.notEqual(start, -1);
  assert.notEqual(end, -1);

  const documentReads = [];
  const firstDocument = { id: 'first-document' };
  const secondDocument = { id: 'second-document' };
  const firstElement = { id: 'first', ownerDocument: firstDocument };
  const secondElement = { id: 'second', ownerDocument: secondDocument };
  const context = {
    studioEditorElementSnapshotAccessors: {
      build(element) {
        const selectedElements = element.ownerDocument === firstDocument
          ? [firstElement]
          : [secondElement];
        documentReads.push(element.ownerDocument);
        return { id: element.id, isSelected: selectedElements.includes(element) };
      }
    },
    SlideNextStudioElementSnapshot: {
      buildStudioElementSnapshot(element, options) {
        return { id: element.id, isSelected: options.isSelectedElement(element) };
      }
    },
    SlideNextStudioEditorLiveSelection: {
      isStudioLiveSelectedElement(elements, element) {
        return Array.isArray(elements) && elements.includes(element);
      }
    },
    assignEditorElementId() {
      return 'editor-element';
    },
    isElementLocked() {
      return false;
    },
    isElementHidden() {
      return false;
    },
    getStudioSelectedElements(doc) {
      documentReads.push(doc);
      return doc === firstDocument ? [firstElement] : [secondElement];
    }
  };

  vm.createContext(context);
  vm.runInContext(fileContent.slice(start, end), context);

  assert.deepEqual(context.buildEditorElementSnapshot(firstElement), {
    id: 'first',
    isSelected: true
  });
  assert.deepEqual(context.buildEditorElementSnapshot(secondElement), {
    id: 'second',
    isSelected: true
  });
  assert.deepEqual(documentReads, [firstDocument, secondDocument]);
});

test('buildEditorLayerSnapshot uses an empty fallback when the shared layer snapshot builder is unavailable', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const buildEditorLayerSnapshotSource = extractFunctionSource(
    fileContent,
    'function buildEditorLayerSnapshot(slide) {',
    '\n\n    const studioEditorSelectionIdsAdapter ='
  );
  const context = {
    SlideNextStudioElementSnapshot: {},
    getNormalizedSlideLayerOrder() {
      throw new Error('layer snapshot dependencies should not run');
    },
    buildEditorElementSnapshot() {
      throw new Error('layer snapshot dependencies should not run');
    }
  };

  vm.createContext(context);
  vm.runInContext(buildEditorLayerSnapshotSource, context);

  assert.deepEqual(
    JSON.parse(JSON.stringify(context.buildEditorLayerSnapshot({ label: 'slide' }))),
    []
  );
});

test('buildEditorElementSnapshot preserves accessor selection state', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const buildEditorElementSnapshotSource = extractFunctionSource(
    fileContent,
    'function buildEditorElementSnapshot(el) {',
    '\n\n    function buildEditorLayerSnapshot(slide) {'
  );
  let receivedOptions = null;
  const context = {
    studioEditorElementSnapshotAccessors: {
      build(element) {
        receivedOptions = { isSelectedElement: () => false };
        return { id: element.id, isSelected: receivedOptions.isSelectedElement(element) };
      }
    },
    SlideNextStudioElementSnapshot: {
      buildStudioElementSnapshot(element, options) {
        receivedOptions = options;
        return {
          id: element.id,
          isSelected: options.isSelectedElement(element)
        };
      }
    },
    assignEditorElementId() {
      return 'element-1';
    },
    isElementLocked() {
      return false;
    },
    isElementHidden() {
      return false;
    },
    getStudioSelectedElements() {
      throw new Error('selected elements should not be read without live selection runtime');
    },
    SlideNextStudioEditorLiveSelection: {}
  };

  vm.createContext(context);
  vm.runInContext(buildEditorElementSnapshotSource, context);

  const result = context.buildEditorElementSnapshot({ id: 'element-1' });

  assert.deepEqual(
    JSON.parse(JSON.stringify(result)),
    { id: 'element-1', isSelected: false }
  );
  assert.equal(typeof receivedOptions.isSelectedElement, 'function');
});

test('getEditorLayerDisplayMetadata fails closed when shared accessors are unavailable', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const getEditorLayerDisplayMetadataSource = extractFunctionSource(
    fileContent,
    'function getEditorLayerDisplayMetadata(el) {',
    '\n\n    function buildEditorElementSnapshot(el) {'
  );
  const context = {
    SlideNextStudioElementSnapshot: {}
  };

  vm.createContext(context);
  vm.runInContext(getEditorLayerDisplayMetadataSource, context);

  assert.equal(context.getEditorLayerDisplayMetadata({ label: 'element' }), null);
});

test('buildEditorDeckSnapshot delegates through the shared snapshot accessors', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const buildEditorDeckSnapshotSource = extractFunctionSource(
    fileContent,
    'function buildEditorDeckSnapshot(doc = getIframeDoc(), options = {}) {',
    '\n\n    function getStudioActiveSlideIndex(doc = getIframeDoc()) {'
  );

  const iframeDoc = { label: 'iframe-doc' };
  const snapshotResult = {
    activeSlideId: 'slide-shared',
    activeSlideIndex: 1,
    slides: []
  };
  let delegatedDoc = null;
  let delegatedOptions = null;
  const context = {
    studioEditorDeckSnapshotAccessors: {
      build(nextDoc, nextOptions = {}) {
        delegatedDoc = nextDoc;
        delegatedOptions = nextOptions;
        return {
          ...snapshotResult,
          nextDoc,
          includeLayers: !!nextOptions.includeLayers
        };
      }
    },
    getIframeDoc() {
      return iframeDoc;
    }
  };

  vm.createContext(context);
  vm.runInContext(buildEditorDeckSnapshotSource, context);

  assert.deepEqual(
    JSON.parse(JSON.stringify(context.buildEditorDeckSnapshot(undefined, { includeLayers: true }))),
    {
      ...snapshotResult,
      nextDoc: iframeDoc,
      includeLayers: true
    }
  );
  assert.equal(delegatedDoc, iframeDoc);
  assert.deepEqual(delegatedOptions, { includeLayers: true });
});

test('buildEditorDeckSnapshot fails closed when the shared snapshot build-options helper is unavailable', () => {
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
    SlideNextStudioDeckView: deckView,
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

  assert.equal(result, null);
  assert.equal(calls.length, 0);
  assert.equal(buildEditorCanonicalDeckCalls, 0);
});

test('editor canonical resolver delegates to the shared view-state module before the inline fallback', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const helperSource = extractFunctionSource(
    fileContent,
    'function createEditorCanonicalDeckResolverWithBuilder(\n      doc = getIframeDoc(),\n      buildCanonicalDeck = (sourceDoc) => buildEditorCanonicalDeck(sourceDoc)\n    ) {',
    '\n\n    function createEditorCanonicalDeckViewStateOptions(options = {}) {'
  );
  const iframeDoc = { label: 'iframe-doc' };
  const canonicalDeck = { kind: 'slidenext.deck', schemaVersion: 1, slides: [] };
  const buildCanonicalDeck = () => {
    throw new Error('inline builder should not run');
  };
  const calls = [];
  const deckViewApi = { marker: 'deck-view' };
  const context = {
    SlideNextStudioDeckView: deckViewApi,
    SlideNextStudioEditorCanonicalViewState: {
      createStudioEditorCanonicalDeckResolverWithBuilder(nextDoc, options) {
        calls.push([nextDoc, options]);
        return () => canonicalDeck;
      }
    },
    getIframeDoc() {
      return iframeDoc;
    }
  };

  vm.createContext(context);
  runEditorContext(helperSource, context);

  const resolver = context.createEditorCanonicalDeckResolverWithBuilder(
    iframeDoc,
    buildCanonicalDeck
  );

  assert.equal(resolver(), canonicalDeck);
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], iframeDoc);
  assert.equal(calls[0][1].deckViewApi, deckViewApi);
  assert.equal(calls[0][1].buildCanonicalDeck, buildCanonicalDeck);
});

test('buildEditorDeckSnapshot does not reconstruct local snapshot options when shared helpers are unavailable', () => {
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
    SlideNextStudioDeckView: deckView,
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

  assert.equal(result, null);
  assert.equal(calls.length, 0);
  assert.equal(buildEditorCanonicalDeckCalls, 0);
});
