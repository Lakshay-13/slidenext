const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const canonicalDeckModel = require('../shared/canonical-deck.js');
const editorPersistence = require('../shared/studio-editor-persistence.js');
const editorSession = require('../shared/studio-editor-session.js');
const deckView = require('../shared/studio-deck-view.js');
const persistedStateFixture = require('./helpers/studio-persisted-state-fixture.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

function extractFunctionSource(fileContent, startMarker, endMarker) {
  const source = persistedStateFixture.extractPersistedStateAwareFunctionSource(
    fileContent,
    startMarker,
    endMarker
  );
  assert.notEqual(source, null, `Missing function markers: ${startMarker}`);
  return `
function getStudioPresentationTitle() {
  if (typeof studioEditorPresentationLabelStateController !== 'undefined'
    && studioEditorPresentationLabelStateController
    && typeof studioEditorPresentationLabelStateController.getTitle === 'function') {
    return studioEditorPresentationLabelStateController.getTitle();
  }
  return typeof currentTitle !== 'undefined' ? currentTitle : '';
}
${source}`;
}

function createEditorDeckViewSharedOptionsForTest(context, doc) {
  return deckView.createStudioDeckViewSharedOptions(doc, {
    currentSlideIndex: context.currentSlideIndex,
    getPersistedActiveSlideId: () => typeof context.getPersistedActiveSlideId === 'function'
      ? context.getPersistedActiveSlideId()
      : '',
    buildCanonicalDeck: (nextDoc) => typeof context.buildEditorCanonicalDeck === 'function'
      ? context.buildEditorCanonicalDeck(nextDoc)
      : null,
    resolveCanonicalDeckOverride: (nextCanonicalDeck) => nextCanonicalDeck,
    resolveLiveActiveSlideId: (nextDoc) => typeof context.resolveEditorLiveActiveSlideId === 'function'
      ? context.resolveEditorLiveActiveSlideId(nextDoc)
      : '',
    isCanonicalDeck: (deck) => !!deck && Array.isArray(deck.slides)
  });
}

function loadCreateCurrentStudioSessionStateReaders(fileContent, context) {
  context.SlideNextStudioEditorSession ??= editorSession;
  const helperSource = extractFunctionSource(
    fileContent,
    'function createCurrentStudioSessionStateReaders() {',
    '\n\n    function updateCurrentPresentationSessionState(nextState = {}) {'
  );
  vm.runInContext(helperSource, context);
}

function loadApplyCurrentStudioPersistedDeckState(fileContent, context) {
  const helperSource = extractFunctionSource(
    fileContent,
    'function applyCurrentStudioPersistedDeckState(nextState = {}, options = {}) {',
    '\n\n    function setCurrentPresentationCanonicalDeck('
  );
  vm.runInContext(helperSource, context);
}

function loadCreateCurrentStudioPersistenceHandlerOptions(fileContent, context) {
  loadCreateCurrentStudioSessionStateReaders(fileContent, context);
  loadApplyCurrentStudioPersistedDeckState(fileContent, context);
  const helperSource = extractFunctionSource(
    fileContent,
    'function createCurrentStudioPersistenceHandlerOptions(options = {}) {',
    '\n\n    function resolveCurrentStudioPersistenceStateFromCapture(doc = getIframeDoc(), options = {}) {'
  );
  vm.runInContext(helperSource, context);
}

function loadApplyCurrentStudioPersistedCanonicalDeck(fileContent, context) {
  loadApplyCurrentStudioPersistedDeckState(fileContent, context);
}

test('setCurrentPresentationCanonicalDeck normalizes valid deck-like metadata updates for the active presentation', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const setCurrentPresentationCanonicalDeckSource = extractFunctionSource(
    fileContent,
    'function setCurrentPresentationCanonicalDeck(canonicalDeck, presentationUrl = getStudioCurrentPresentationUrl(), presentationTitle = getStudioPresentationTitle()) {',
    '\n\n    function buildEditorCanonicalDeck(doc = getIframeDoc()) {'
  );

  const context = {
    SlideNextStudioDeckContext: require('../shared/studio-deck-context.js'),
    applyCurrentPresentationMetadata(metadata) {
      context.currentPresentationMetadata = metadata;
      return metadata;
    },
    currentPresentationUrl: 'presentations/onboarding-presentation/index.html',
    currentTitle: 'Project Onboarding',
    currentPresentationMetadata: null,
    buildCurrentPresentationMetadataSeed(presentationUrl, presentationTitle) {
      return {
        id: 'onboarding-presentation',
        title: presentationTitle,
        sourcePath: presentationUrl
      };
    }
  };

  vm.createContext(context);
  vm.runInContext(setCurrentPresentationCanonicalDeckSource, context);

  context.setCurrentPresentationCanonicalDeck({
    metadata: {
      title: 'Project Onboarding'
    },
    slides: [
      {
        id: 'slide-1',
        nodes: []
      }
    ]
  });

  assert.deepEqual(context.currentPresentationMetadata, {
    id: 'onboarding-presentation',
    title: 'Project Onboarding',
    sourcePath: 'presentations/onboarding-presentation/index.html',
    canonicalDeck: canonicalDeckModel.createCanonicalDeck({
      metadata: {
        title: 'Project Onboarding'
      },
      slides: [
        {
          id: 'slide-1',
          nodes: []
        }
      ]
    })
  });
});

test('setCurrentPresentationCanonicalDeck fails closed when the deck context updater is unavailable', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const setCurrentPresentationCanonicalDeckSource = extractFunctionSource(
    fileContent,
    'function setCurrentPresentationCanonicalDeck(canonicalDeck, presentationUrl = getStudioCurrentPresentationUrl(), presentationTitle = getStudioPresentationTitle()) {',
    '\n\n    function buildEditorCanonicalDeck(doc = getIframeDoc()) {'
  );

  let applyCalls = 0;
  const context = {
    SlideNextStudioDeckContext: {},
    applyCurrentPresentationMetadata(metadata) {
      applyCalls += 1;
      context.currentPresentationMetadata = metadata;
      return metadata;
    },
    currentPresentationUrl: 'presentations/onboarding-presentation/index.html',
    currentTitle: 'Project Onboarding',
    currentPresentationMetadata: null
  };

  vm.createContext(context);
  vm.runInContext(setCurrentPresentationCanonicalDeckSource, context);

  context.setCurrentPresentationCanonicalDeck({
    metadata: {
      title: 'Project Onboarding'
    },
    slides: [
      {
        id: 'slide-1',
        nodes: []
      }
    ]
  });

  assert.equal(applyCalls, 0);
  assert.equal(context.currentPresentationMetadata, null);
});

test('setCurrentPresentationCanonicalDeck ignores malformed deck-like metadata updates for the active presentation', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const setCurrentPresentationCanonicalDeckSource = extractFunctionSource(
    fileContent,
    'function setCurrentPresentationCanonicalDeck(canonicalDeck, presentationUrl = getStudioCurrentPresentationUrl(), presentationTitle = getStudioPresentationTitle()) {',
    '\n\n    function buildEditorCanonicalDeck(doc = getIframeDoc()) {'
  );

  let applyCalls = 0;
  const context = {
    SlideNextStudioDeckContext: require('../shared/studio-deck-context.js'),
    applyCurrentPresentationMetadata(metadata) {
      applyCalls += 1;
      context.currentPresentationMetadata = metadata;
      return metadata;
    },
    currentPresentationUrl: 'presentations/onboarding-presentation/index.html',
    currentTitle: 'Project Onboarding',
    currentPresentationMetadata: null,
    buildCurrentPresentationMetadataSeed(presentationUrl, presentationTitle) {
      return {
        id: 'onboarding-presentation',
        title: presentationTitle,
        sourcePath: presentationUrl
      };
    }
  };

  vm.createContext(context);
  vm.runInContext(setCurrentPresentationCanonicalDeckSource, context);

  context.setCurrentPresentationCanonicalDeck({
    metadata: {
      title: 'Broken Deck'
    }
  });

  assert.equal(applyCalls, 0);
  assert.equal(context.currentPresentationMetadata, null);
});

test('setCurrentPresentationCanonicalDeck ignores updates for inactive presentations', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const setCurrentPresentationCanonicalDeckSource = extractFunctionSource(
    fileContent,
    'function setCurrentPresentationCanonicalDeck(canonicalDeck, presentationUrl = getStudioCurrentPresentationUrl(), presentationTitle = getStudioPresentationTitle()) {',
    '\n\n    function buildEditorCanonicalDeck(doc = getIframeDoc()) {'
  );

  let applyCalls = 0;
  const activeMetadata = {
    id: 'onboarding-presentation',
    title: 'Project Onboarding',
    sourcePath: 'presentations/onboarding-presentation/index.html'
  };
  const context = {
    SlideNextStudioDeckContext: require('../shared/studio-deck-context.js'),
    applyCurrentPresentationMetadata(metadata) {
      applyCalls += 1;
      context.currentPresentationMetadata = metadata;
      return metadata;
    },
    currentPresentationUrl: 'presentations/onboarding-presentation/index.html',
    currentTitle: 'Project Onboarding',
    currentPresentationMetadata: activeMetadata,
    buildCurrentPresentationMetadataSeed(presentationUrl, presentationTitle) {
      return {
        id: 'onboarding-presentation',
        title: presentationTitle,
        sourcePath: presentationUrl
      };
    }
  };

  vm.createContext(context);
  vm.runInContext(setCurrentPresentationCanonicalDeckSource, context);

  context.setCurrentPresentationCanonicalDeck(
    {
      metadata: {
        title: 'AI Tools'
      },
      slides: [
        {
          id: 'slide-1',
          nodes: []
        }
      ]
    },
    'presentations/ai-tools-presentation/index.html',
    'AI Tools'
  );

  assert.equal(applyCalls, 0);
  assert.equal(context.currentPresentationMetadata, activeMetadata);
});

test('setCurrentPresentationCanonicalDeck delegates metadata application through the shared deck context helper when available', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const setCurrentPresentationCanonicalDeckSource = extractFunctionSource(
    fileContent,
    'function setCurrentPresentationCanonicalDeck(canonicalDeck, presentationUrl = getStudioCurrentPresentationUrl(), presentationTitle = getStudioPresentationTitle()) {',
    '\n\n    function buildEditorCanonicalDeck(doc = getIframeDoc()) {'
  );

  const canonicalDeckLike = {
    metadata: {
      title: 'Project Onboarding'
    },
    slides: [
      {
        id: 'slide-1',
        nodes: []
      }
    ]
  };
  const nextPresentationMetadata = {
    id: 'onboarding-presentation',
    title: 'Project Onboarding',
    sourcePath: 'presentations/onboarding-presentation/index.html',
    canonicalDeck: canonicalDeckModel.createCanonicalDeck(canonicalDeckLike)
  };
  let helperCall = null;
  const context = {
    SlideNextStudioDeckContext: {
      applyStudioPresentationMetadataCanonicalDeckUpdate(nextCanonicalDeck, options = {}) {
        helperCall = {
          nextCanonicalDeck,
          currentPresentationMetadata: options.currentPresentationMetadata,
          currentPresentationUrl: options.currentPresentationUrl,
          presentationUrl: options.presentationUrl,
          presentationTitle: options.presentationTitle,
          hasBuildPresentationMetadataSeed: typeof options.buildPresentationMetadataSeed === 'function',
          hasApplyPresentationMetadata: typeof options.applyPresentationMetadata === 'function'
        };
        options.applyPresentationMetadata(nextPresentationMetadata);
        return nextPresentationMetadata;
      }
    },
    applyCurrentPresentationMetadata(metadata) {
      context.currentPresentationMetadata = metadata;
      return metadata;
    },
    currentPresentationUrl: 'presentations/onboarding-presentation/index.html',
    currentTitle: 'Project Onboarding',
    currentPresentationMetadata: null,
    buildCurrentPresentationMetadataSeed() {
      throw new Error('buildCurrentPresentationMetadataSeed should be delegated through the shared deck context helper');
    }
  };

  vm.createContext(context);
  vm.runInContext(setCurrentPresentationCanonicalDeckSource, context);

  context.setCurrentPresentationCanonicalDeck(canonicalDeckLike);

  assert.deepEqual(helperCall, {
    nextCanonicalDeck: canonicalDeckLike,
    currentPresentationMetadata: null,
    currentPresentationUrl: 'presentations/onboarding-presentation/index.html',
    presentationUrl: 'presentations/onboarding-presentation/index.html',
    presentationTitle: 'Project Onboarding',
    hasBuildPresentationMetadataSeed: true,
    hasApplyPresentationMetadata: true
  });
  assert.deepEqual(context.currentPresentationMetadata, nextPresentationMetadata);
});

test('saveVersionCheckpoint refreshes persisted html and canonical metadata after a successful save rewrite through the shared helper', async () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const saveVersionCheckpointSource = extractFunctionSource(
    fileContent,
    'async function saveVersionCheckpoint(versionLabel, cleanHtml, presentationUrl = getStudioCurrentPresentationUrl(), options = {}) {',
    '\n\n    // 6. AutoSave debouncing pipeline'
  );

  const canonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: []
  };
  const fetchCalls = [];
  const canonicalDeckUpdates = [];
  const livePlaybackState = {
    activeSlideIds: ['slide-2'],
    slideCounterText: '2 / 3'
  };
  let capturedVersionCheckpointExecutionArgs = null;
  const context = {
    SlideNextCanonicalDeck: {
      isCanonicalDeck(deck) {
        return !!deck && deck.kind === 'slidenext.deck' && Array.isArray(deck.slides);
      }
    },
    SlideNextStudioEditorPersistence: {
      ...editorPersistence,
      async executeStudioVersionCheckpointPersistenceRequestWithSuccess(versionLabel, cleanHtml, presentationUrl, options = {}) {
        capturedVersionCheckpointExecutionArgs = [versionLabel, cleanHtml, presentationUrl, options];
        return editorPersistence.executeStudioVersionCheckpointPersistenceRequestWithSuccess(
          versionLabel,
          cleanHtml,
          presentationUrl,
          options
        );
      }
    },
    createCurrentStudioSessionStateReaders() {
      return {
        getCurrentPresentationUrl: () => context.currentPresentationUrl,
        getCurrentSessionToken: () => context.studioEditorSessionToken
      };
    },
    currentPresentationUrl: 'presentations/onboarding-presentation/index.html',
    studioEditorSessionToken: 4,
    lastPersistedDeckHtml: '',
    lastPersistedCanonicalDeck: null,
    persistedDeckPlaybackState: null,
    isCurrentDeckStatePersisted() {
      return false;
    },
    updateEditorPersistedDeckState(nextState) {
      if (Object.prototype.hasOwnProperty.call(nextState, 'cleanHtml')) {
        context.lastPersistedDeckHtml = nextState.cleanHtml;
      }
      if (Object.prototype.hasOwnProperty.call(nextState, 'canonicalDeck')) {
        context.lastPersistedCanonicalDeck = canonicalDeckModel.createCanonicalDeck(nextState.canonicalDeck);
      }
      if (Object.prototype.hasOwnProperty.call(nextState, 'playbackState')) {
        context.persistedDeckPlaybackState = nextState.playbackState;
      }
    },
    capturePersistedDeckPlaybackState(doc) {
      assert.deepEqual(doc, { label: 'iframe-doc' });
      return livePlaybackState;
    },
    buildEditorSaveRequestBody(doc, cleanHtml, options = {}) {
      assert.equal(options.canonicalDeck, canonicalDeck);
      return {
        htmlPath: options.presentationUrl,
        htmlContent: cleanHtml,
        versionLabel: options.versionLabel,
        canonicalDeck
      };
    },
    fetch: async (url, init) => {
      fetchCalls.push([url, JSON.parse(init.body)]);
      return {
        async json() {
          return { success: true };
        }
      };
    },
    setCurrentPresentationCanonicalDeck(nextCanonicalDeck, presentationUrl) {
      canonicalDeckUpdates.push([nextCanonicalDeck, presentationUrl]);
    }
  };

  vm.createContext(context);
  loadApplyCurrentStudioPersistedCanonicalDeck(fileContent, context);
  loadCreateCurrentStudioPersistenceHandlerOptions(fileContent, context);
  vm.runInContext(saveVersionCheckpointSource, context);

  const result = await context.saveVersionCheckpoint(
    'Checkpoint A',
    '<html>persisted</html>',
    'presentations/onboarding-presentation/index.html',
    {
      sessionToken: 4,
      doc: { label: 'iframe-doc' },
      canonicalDeck
    }
  );

  assert.deepEqual(result, { success: true });
  assert.deepEqual(fetchCalls, [[
    '/api/save',
    {
      htmlPath: 'presentations/onboarding-presentation/index.html',
      htmlContent: '<html>persisted</html>',
      versionLabel: 'Checkpoint A',
      canonicalDeck
    }
  ]]);
  assert.equal(capturedVersionCheckpointExecutionArgs[0], 'Checkpoint A');
  assert.equal(capturedVersionCheckpointExecutionArgs[1], '<html>persisted</html>');
  assert.equal(capturedVersionCheckpointExecutionArgs[2], 'presentations/onboarding-presentation/index.html');
  assert.equal(capturedVersionCheckpointExecutionArgs[3].sessionToken, 4);
  assert.deepEqual(capturedVersionCheckpointExecutionArgs[3].doc, { label: 'iframe-doc' });
  assert.equal(capturedVersionCheckpointExecutionArgs[3].canonicalDeck, canonicalDeck);
  assert.equal(typeof capturedVersionCheckpointExecutionArgs[3].applyPersistenceSuccess, 'function');
  assert.deepEqual(JSON.parse(JSON.stringify(capturedVersionCheckpointExecutionArgs[3].successOptions)), {
    presentationUrl: 'presentations/onboarding-presentation/index.html'
  });
  assert.equal(context.lastPersistedDeckHtml, '<html>persisted</html>');
  assert.deepEqual(context.lastPersistedCanonicalDeck, canonicalDeckModel.createCanonicalDeck(canonicalDeck));
  assert.deepEqual(context.persistedDeckPlaybackState, livePlaybackState);
  assert.deepEqual(canonicalDeckUpdates, [[
    canonicalDeckModel.createCanonicalDeck(canonicalDeck),
    'presentations/onboarding-presentation/index.html'
  ]]);
});

test('saveVersionCheckpoint clears the persisted playback baseline after a successful save rewrite without live playback markers', async () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const saveVersionCheckpointSource = extractFunctionSource(
    fileContent,
    'async function saveVersionCheckpoint(versionLabel, cleanHtml, presentationUrl = getStudioCurrentPresentationUrl(), options = {}) {',
    '\n\n    // 6. AutoSave debouncing pipeline'
  );

  const canonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: []
  };
  const fetchCalls = [];
  const context = {
    SlideNextStudioEditorPersistence: editorPersistence,
    createCurrentStudioSessionStateReaders() {
      return {
        getCurrentPresentationUrl: () => context.currentPresentationUrl,
        getCurrentSessionToken: () => context.studioEditorSessionToken
      };
    },
    currentPresentationUrl: 'presentations/onboarding-presentation/index.html',
    studioEditorSessionToken: 5,
    lastPersistedDeckHtml: '',
    lastPersistedCanonicalDeck: null,
    persistedDeckPlaybackState: {
      activeSlideIds: ['slide-stale'],
      slideCounterText: '4 / 4'
    },
    isCurrentDeckStatePersisted() {
      return false;
    },
    updateEditorPersistedDeckState(nextState) {
      if (Object.prototype.hasOwnProperty.call(nextState, 'cleanHtml')) {
        context.lastPersistedDeckHtml = nextState.cleanHtml;
      }
      if (Object.prototype.hasOwnProperty.call(nextState, 'canonicalDeck')) {
        context.lastPersistedCanonicalDeck = canonicalDeckModel.createCanonicalDeck(nextState.canonicalDeck);
      }
      if (Object.prototype.hasOwnProperty.call(nextState, 'playbackState')) {
        context.persistedDeckPlaybackState = nextState.playbackState;
      }
    },
    capturePersistedDeckPlaybackState(doc) {
      assert.deepEqual(doc, { label: 'iframe-doc' });
      return null;
    },
    buildEditorSaveRequestBody(doc, cleanHtml, options = {}) {
      assert.equal(options.canonicalDeck, canonicalDeck);
      return {
        htmlPath: options.presentationUrl,
        htmlContent: cleanHtml,
        versionLabel: options.versionLabel,
        canonicalDeck
      };
    },
    fetch: async (url, init) => {
      fetchCalls.push([url, JSON.parse(init.body)]);
      return {
        async json() {
          return { success: true };
        }
      };
    },
    setCurrentPresentationCanonicalDeck() {}
  };

  vm.createContext(context);
  loadApplyCurrentStudioPersistedCanonicalDeck(fileContent, context);
  loadCreateCurrentStudioPersistenceHandlerOptions(fileContent, context);
  vm.runInContext(saveVersionCheckpointSource, context);

  await context.saveVersionCheckpoint(
    'Checkpoint Null Playback',
    '<html>persisted</html>',
    'presentations/onboarding-presentation/index.html',
    {
      sessionToken: 5,
      doc: { label: 'iframe-doc' },
      canonicalDeck
    }
  );

  assert.deepEqual(fetchCalls, [[
    '/api/save',
    {
      htmlPath: 'presentations/onboarding-presentation/index.html',
      htmlContent: '<html>persisted</html>',
      versionLabel: 'Checkpoint Null Playback',
      canonicalDeck
    }
  ]]);
  assert.equal(context.lastPersistedDeckHtml, '<html>persisted</html>');
  assert.deepEqual(context.lastPersistedCanonicalDeck, canonicalDeckModel.createCanonicalDeck(canonicalDeck));
  assert.equal(context.persistedDeckPlaybackState, null);
});

test('saveVersionCheckpoint reuses a provided canonical deck when fallback playback capture needs the current session slide', async () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const getPersistedActiveSlideIdSource = extractFunctionSource(
    fileContent,
    'function getPersistedActiveSlideId(playbackState = persistedDeckPlaybackState) {',
    '\n\n    function buildEditorDeckSnapshot(doc = getIframeDoc(), options = {}) {'
  );
  const resolveEditorFallbackActiveSlideIdSource = extractFunctionSource(
    fileContent,
    'function resolveEditorFallbackActiveSlideId(doc = getIframeDoc(), canonicalDeck = null) {',
    '\n\n    function resolveEditorLiveActiveSlide(doc = getIframeDoc()) {'
  );
  const capturePersistedDeckPlaybackStateSource = extractFunctionSource(
    fileContent,
    'function capturePersistedDeckPlaybackState(doc = getIframeDoc(), canonicalDeck = null) {',
    '\n\n    function buildEditorSaveRequestBody(doc = getIframeDoc(), cleanHtml = null, options = {}) {'
  );
  const saveVersionCheckpointSource = extractFunctionSource(
    fileContent,
    'async function saveVersionCheckpoint(versionLabel, cleanHtml, presentationUrl = getStudioCurrentPresentationUrl(), options = {}) {',
    '\n\n    // 6. AutoSave debouncing pipeline'
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
  let buildEditorCanonicalDeckCalls = 0;
  let handledPersistenceContext = null;
  const fetchCalls = [];
  const context = {
    EDITOR_SLIDE_ID_ATTR: 'data-slide-id',
    SlideNextStudioDeckView: {
      createStudioDeckViewSharedOptions: deckView.createStudioDeckViewSharedOptions,
      resolveStudioFallbackActiveSlideId: deckView.resolveStudioFallbackActiveSlideId
    },
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
    createEditorDeckViewSharedOptions(nextDoc) {
      return createEditorDeckViewSharedOptionsForTest(context, nextDoc);
    },
    SlideNextStudioEditorPersistence: {
      ...editorPersistence,
      handleStudioPersistenceSuccess(persistenceContext, options = {}) {
        handledPersistenceContext = persistenceContext;
        return editorPersistence.handleStudioPersistenceSuccess(persistenceContext, options);
      }
    },
    buildEditorCanonicalDeck(nextDoc) {
      buildEditorCanonicalDeckCalls += 1;
      assert.equal(nextDoc, iframeDoc);
      return canonicalDeck;
    },
    buildEditorSaveRequestBody(doc, cleanHtml, options = {}) {
      assert.equal(doc, iframeDoc);
      assert.equal(options.canonicalDeck, canonicalDeck);
      return {
        htmlPath: options.presentationUrl,
        htmlContent: cleanHtml,
        versionLabel: options.versionLabel,
        canonicalDeck
      };
    },
    fetch: async (url, init) => {
      fetchCalls.push([url, JSON.parse(init.body)]);
      return {
        async json() {
          return { success: true };
        }
      };
    },
    getSlides() {
      return [];
    },
    createCurrentStudioSessionStateReaders() {
      return {
        getCurrentPresentationUrl: () => context.currentPresentationUrl,
        getCurrentSessionToken: () => context.studioEditorSessionToken
      };
    },
    currentPresentationUrl: 'presentations/onboarding-presentation/index.html',
    isCurrentDeckStatePersisted() {
      return false;
    },
    currentSlideIndex: 1,
    persistedDeckPlaybackState: {
      activeSlideIds: ['slide-stale'],
      slideCounterText: '1 / 5'
    },
    setCurrentPresentationCanonicalDeck() {},
    studioEditorSessionToken: 8,
    updateEditorPersistedDeckState() {},
    resolveEditorFallbackCanonicalDeck(nextDoc, nextCanonicalDeck) {
      return nextCanonicalDeck || context.buildEditorCanonicalDeck(nextDoc);
    },
    resolveEditorLiveActiveSlideId(nextDoc) {
      assert.equal(nextDoc, iframeDoc);
      return '';
    }
  };

  vm.createContext(context);
  loadApplyCurrentStudioPersistedCanonicalDeck(fileContent, context);
  loadCreateCurrentStudioPersistenceHandlerOptions(fileContent, context);
  vm.runInContext(getPersistedActiveSlideIdSource, context);
  vm.runInContext(resolveEditorFallbackActiveSlideIdSource, context);
  vm.runInContext(capturePersistedDeckPlaybackStateSource, context);
  vm.runInContext(saveVersionCheckpointSource, context);

  const result = await context.saveVersionCheckpoint(
    'Checkpoint Canonical Playback',
    '<html>persisted</html>',
    'presentations/onboarding-presentation/index.html',
    {
      doc: iframeDoc,
      canonicalDeck
    }
  );

  assert.deepEqual(result, { success: true });
  assert.deepEqual(fetchCalls, [[
    '/api/save',
    {
      htmlPath: 'presentations/onboarding-presentation/index.html',
      htmlContent: '<html>persisted</html>',
      versionLabel: 'Checkpoint Canonical Playback',
      canonicalDeck
    }
  ]]);
  assert.equal(buildEditorCanonicalDeckCalls, 0);
  assert.deepEqual(
    JSON.parse(JSON.stringify(handledPersistenceContext.playbackState)),
    {
      activeSlideIds: ['slide-2'],
      slideCounterText: '2 / 5'
    }
  );
});

test('saveVersionCheckpoint preserves the persisted playback baseline when no live iframe document is available', async () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const saveVersionCheckpointSource = extractFunctionSource(
    fileContent,
    'async function saveVersionCheckpoint(versionLabel, cleanHtml, presentationUrl = getStudioCurrentPresentationUrl(), options = {}) {',
    '\n\n    // 6. AutoSave debouncing pipeline'
  );

  const canonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: []
  };
  const fetchCalls = [];
  const existingPlaybackState = {
    activeSlideIds: ['slide-persisted'],
    slideCounterText: '3 / 4'
  };
  const context = {
    SlideNextStudioEditorPersistence: editorPersistence,
    createCurrentStudioSessionStateReaders() {
      return {
        getCurrentPresentationUrl: () => context.currentPresentationUrl,
        getCurrentSessionToken: () => context.studioEditorSessionToken
      };
    },
    currentPresentationUrl: 'presentations/onboarding-presentation/index.html',
    studioEditorSessionToken: 6,
    lastPersistedDeckHtml: '',
    lastPersistedCanonicalDeck: null,
    persistedDeckPlaybackState: existingPlaybackState,
    isCurrentDeckStatePersisted() {
      return false;
    },
    updateEditorPersistedDeckState(nextState) {
      if (Object.prototype.hasOwnProperty.call(nextState, 'cleanHtml')) {
        context.lastPersistedDeckHtml = nextState.cleanHtml;
      }
      if (Object.prototype.hasOwnProperty.call(nextState, 'canonicalDeck')) {
        context.lastPersistedCanonicalDeck = canonicalDeckModel.createCanonicalDeck(nextState.canonicalDeck);
      }
      if (Object.prototype.hasOwnProperty.call(nextState, 'playbackState')) {
        context.persistedDeckPlaybackState = nextState.playbackState;
      }
    },
    capturePersistedDeckPlaybackState(doc) {
      assert.equal(doc, null);
      return null;
    },
    buildEditorSaveRequestBody(doc, cleanHtml, options = {}) {
      assert.equal(doc, null);
      assert.equal(options.canonicalDeck, canonicalDeck);
      return {
        htmlPath: options.presentationUrl,
        htmlContent: cleanHtml,
        versionLabel: options.versionLabel,
        canonicalDeck
      };
    },
    fetch: async (url, init) => {
      fetchCalls.push([url, JSON.parse(init.body)]);
      return {
        async json() {
          return { success: true };
        }
      };
    },
    setCurrentPresentationCanonicalDeck() {}
  };

  vm.createContext(context);
  loadApplyCurrentStudioPersistedCanonicalDeck(fileContent, context);
  loadCreateCurrentStudioPersistenceHandlerOptions(fileContent, context);
  vm.runInContext(saveVersionCheckpointSource, context);

  await context.saveVersionCheckpoint(
    'Checkpoint Persisted Playback',
    '<html>persisted</html>',
    'presentations/onboarding-presentation/index.html',
    {
      sessionToken: 6,
      doc: null,
      canonicalDeck
    }
  );

  assert.deepEqual(fetchCalls, [[
    '/api/save',
    {
      htmlPath: 'presentations/onboarding-presentation/index.html',
      htmlContent: '<html>persisted</html>',
      versionLabel: 'Checkpoint Persisted Playback',
      canonicalDeck
    }
  ]]);
  assert.equal(context.lastPersistedDeckHtml, '<html>persisted</html>');
  assert.deepEqual(context.lastPersistedCanonicalDeck, canonicalDeckModel.createCanonicalDeck(canonicalDeck));
  assert.equal(context.persistedDeckPlaybackState, existingPlaybackState);
});

test('saveVersionCheckpoint keeps save rewrites enabled when canonical state changed despite matching persisted html', async () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const saveVersionCheckpointSource = extractFunctionSource(
    fileContent,
    'async function saveVersionCheckpoint(versionLabel, cleanHtml, presentationUrl = getStudioCurrentPresentationUrl(), options = {}) {',
    '\n\n    // 6. AutoSave debouncing pipeline'
  );

  const currentCanonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: [
      {
        id: 'slide-1',
        nodes: [
          {
            id: 'node-1',
            type: 'html'
          }
        ]
      }
    ]
  };
  const persistedCanonicalDeck = canonicalDeckModel.createCanonicalDeck({
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: []
  });
  const fetchCalls = [];
  const context = {
    SlideNextStudioEditorPersistence: editorPersistence,
    capturePersistedDeckPlaybackState() {
      return null;
    },
    createCurrentStudioSessionStateReaders() {
      return {
        getCurrentPresentationUrl: () => context.currentPresentationUrl,
        getCurrentSessionToken: () => context.studioEditorSessionToken
      };
    },
    currentPresentationUrl: 'presentations/onboarding-presentation/index.html',
    studioEditorSessionToken: 7,
    lastPersistedDeckHtml: '<html>persisted</html>',
    lastPersistedCanonicalDeck: persistedCanonicalDeck,
    isCurrentDeckStatePersisted(saveRequestBody, cleanHtml) {
      return editorPersistence.isStudioPersistedState(cleanHtml, saveRequestBody && saveRequestBody.canonicalDeck, {
        persistedHtml: context.lastPersistedDeckHtml,
        persistedCanonicalDeck: context.lastPersistedCanonicalDeck
      });
    },
    updateEditorPersistedDeckState(nextState) {
      if (Object.prototype.hasOwnProperty.call(nextState, 'cleanHtml')) {
        context.lastPersistedDeckHtml = nextState.cleanHtml;
      }
      if (Object.prototype.hasOwnProperty.call(nextState, 'canonicalDeck')) {
        context.lastPersistedCanonicalDeck = canonicalDeckModel.createCanonicalDeck(nextState.canonicalDeck);
      }
    },
    buildEditorSaveRequestBody(doc, cleanHtml, options = {}) {
      assert.equal(options.canonicalDeck, currentCanonicalDeck);
      return {
        htmlPath: options.presentationUrl,
        htmlContent: cleanHtml,
        versionLabel: options.versionLabel,
        canonicalDeck: currentCanonicalDeck
      };
    },
    fetch: async (url, init) => {
      fetchCalls.push([url, JSON.parse(init.body)]);
      return {
        async json() {
          return { success: true };
        }
      };
    },
    setCurrentPresentationCanonicalDeck() {}
  };

  vm.createContext(context);
  loadApplyCurrentStudioPersistedCanonicalDeck(fileContent, context);
  loadCreateCurrentStudioPersistenceHandlerOptions(fileContent, context);
  vm.runInContext(saveVersionCheckpointSource, context);

  await context.saveVersionCheckpoint(
    'Checkpoint B',
    '<html>persisted</html>',
    'presentations/onboarding-presentation/index.html',
    {
      sessionToken: 7,
      doc: { label: 'iframe-doc' },
      canonicalDeck: currentCanonicalDeck
    }
  );

  assert.deepEqual(fetchCalls, [[
    '/api/save',
    {
      htmlPath: 'presentations/onboarding-presentation/index.html',
      htmlContent: '<html>persisted</html>',
      versionLabel: 'Checkpoint B',
      canonicalDeck: currentCanonicalDeck
    }
  ]]);
});
