const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const canonicalDeckModel = require('../shared/canonical-deck.js');
const editorPersistence = require('../shared/studio-editor-persistence.js');
const editorSession = require('../shared/studio-editor-session.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

function extractFunctionSource(fileContent, startMarker, endMarker) {
  const start = fileContent.indexOf(startMarker);
  assert.notEqual(start, -1, `Missing start marker: ${startMarker}`);
  const end = fileContent.indexOf(endMarker, start);
  assert.notEqual(end, -1, `Missing end marker: ${endMarker}`);
  return fileContent.slice(start, end);
}

function loadCreateCurrentStudioSessionStateOptions(fileContent, context) {
  context.SlideNextStudioEditorSession ??= editorSession;
  const helperSource = extractFunctionSource(
    fileContent,
    'function createCurrentStudioSessionStateOptions(options = {}) {',
    '\n\n    function createCurrentStudioFrameLoadHandler('
  );
  vm.runInContext(helperSource, context);
}

function loadHandleCurrentStudioPersistenceSuccess(fileContent, context) {
  loadCreateCurrentStudioSessionStateOptions(fileContent, context);
  const helperSource = extractFunctionSource(
    fileContent,
    'function handleCurrentStudioPersistenceSuccess(persistenceContext, options = {}) {',
    '\n\n    function handleCurrentStudioPersistenceFailure(persistenceContext, options = {}) {'
  );
  vm.runInContext(helperSource, context);
}

function loadHandleCurrentStudioPersistenceFailure(fileContent, context) {
  loadCreateCurrentStudioSessionStateOptions(fileContent, context);
  const helperSource = extractFunctionSource(
    fileContent,
    'function handleCurrentStudioPersistenceFailure(persistenceContext, options = {}) {',
    '\n\n    async function saveVersionCheckpoint(versionLabel, cleanHtml, presentationUrl = currentPresentationUrl, options = {}) {'
  );
  vm.runInContext(helperSource, context);
}

test('setCurrentPresentationCanonicalDeck normalizes valid deck-like metadata updates for the active presentation', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const setCurrentPresentationCanonicalDeckSource = extractFunctionSource(
    fileContent,
    'function setCurrentPresentationCanonicalDeck(canonicalDeck, presentationUrl = currentPresentationUrl, presentationTitle = currentTitle) {',
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

test('handleCurrentStudioPersistenceSuccess reuses current session readers and persisted deck setters', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const calls = [];
  const canonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: []
  };
  const playbackState = {
    activeSlideIds: ['slide-2'],
    slideCounterText: '2 / 4'
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
    studioEditorSessionToken: 4,
    updateEditorPersistedDeckState(nextState) {
      calls.push(['updateEditorPersistedDeckState', nextState]);
    },
    setCurrentPresentationCanonicalDeck(nextCanonicalDeck, presentationUrl) {
      calls.push(['setCurrentPresentationCanonicalDeck', nextCanonicalDeck, presentationUrl]);
    }
  };

  vm.createContext(context);
  loadHandleCurrentStudioPersistenceSuccess(fileContent, context);

  const applied = context.handleCurrentStudioPersistenceSuccess({
    presentationUrl: 'presentations/onboarding-presentation/index.html',
    cleanHtml: '<html>persisted</html>',
    canonicalDeck,
    playbackState
  }, {
    onSuccess(nextContext) {
      calls.push(['onSuccess', nextContext.presentationUrl]);
    }
  });

  assert.equal(applied, true);
  assert.deepEqual(JSON.parse(JSON.stringify(calls)), [
    ['updateEditorPersistedDeckState', { cleanHtml: '<html>persisted</html>' }],
    ['updateEditorPersistedDeckState', { canonicalDeck }],
    ['setCurrentPresentationCanonicalDeck', canonicalDeck, 'presentations/onboarding-presentation/index.html'],
    ['updateEditorPersistedDeckState', { playbackState }],
    ['onSuccess', 'presentations/onboarding-presentation/index.html']
  ]);
});

test('handleCurrentStudioPersistenceFailure reuses current session readers for failure handling', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const calls = [];
  const context = {
    SlideNextStudioEditorPersistence: editorPersistence,
    createCurrentStudioSessionStateReaders() {
      return {
        getCurrentPresentationUrl: () => context.currentPresentationUrl,
        getCurrentSessionToken: () => context.studioEditorSessionToken
      };
    },
    currentPresentationUrl: 'presentations/onboarding-presentation/index.html',
    studioEditorSessionToken: 5
  };

  vm.createContext(context);
  loadHandleCurrentStudioPersistenceFailure(fileContent, context);

  const applied = context.handleCurrentStudioPersistenceFailure({
    presentationUrl: 'presentations/onboarding-presentation/index.html',
    cleanHtml: '<html>persisted</html>',
    sessionToken: 5
  }, {
    onFailure(nextContext) {
      calls.push(['onFailure', nextContext.presentationUrl]);
    }
  });

  assert.equal(applied, true);
  assert.deepEqual(calls, [['onFailure', 'presentations/onboarding-presentation/index.html']]);
});

test('saveVersionCheckpoint refreshes persisted html and canonical metadata after a successful save rewrite', async () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const saveVersionCheckpointSource = extractFunctionSource(
    fileContent,
    'async function saveVersionCheckpoint(versionLabel, cleanHtml, presentationUrl = currentPresentationUrl, options = {}) {',
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
  const context = {
    SlideNextCanonicalDeck: {
      isCanonicalDeck(deck) {
        return !!deck && deck.kind === 'slidenext.deck' && Array.isArray(deck.slides);
      }
    },
    SlideNextStudioEditorPersistence: editorPersistence,
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
  loadHandleCurrentStudioPersistenceSuccess(fileContent, context);
  loadHandleCurrentStudioPersistenceFailure(fileContent, context);
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
    'async function saveVersionCheckpoint(versionLabel, cleanHtml, presentationUrl = currentPresentationUrl, options = {}) {',
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
  loadHandleCurrentStudioPersistenceSuccess(fileContent, context);
  loadHandleCurrentStudioPersistenceFailure(fileContent, context);
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
    'async function saveVersionCheckpoint(versionLabel, cleanHtml, presentationUrl = currentPresentationUrl, options = {}) {',
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
    SlideNextStudioEditorPersistence: editorPersistence,
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
    handleCurrentStudioPersistenceFailure() {
      throw new Error('saveVersionCheckpoint should not hit the failure handler');
    },
    handleCurrentStudioPersistenceSuccess(persistenceContext) {
      handledPersistenceContext = persistenceContext;
    },
    isCurrentDeckStatePersisted() {
      return false;
    },
    currentSlideIndex: 1,
    persistedDeckPlaybackState: {
      activeSlideIds: ['slide-stale'],
      slideCounterText: '1 / 5'
    },
    resolveEditorLiveActiveSlideId(nextDoc) {
      assert.equal(nextDoc, iframeDoc);
      return '';
    }
  };

  vm.createContext(context);
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
    'async function saveVersionCheckpoint(versionLabel, cleanHtml, presentationUrl = currentPresentationUrl, options = {}) {',
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
  loadHandleCurrentStudioPersistenceSuccess(fileContent, context);
  loadHandleCurrentStudioPersistenceFailure(fileContent, context);
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
    'async function saveVersionCheckpoint(versionLabel, cleanHtml, presentationUrl = currentPresentationUrl, options = {}) {',
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
  loadHandleCurrentStudioPersistenceSuccess(fileContent, context);
  loadHandleCurrentStudioPersistenceFailure(fileContent, context);
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
