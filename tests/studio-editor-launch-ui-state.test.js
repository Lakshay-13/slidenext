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

function createClassList(initialValues = []) {
  const values = new Set(initialValues);
  return {
    add(...nextValues) {
      nextValues.forEach((value) => values.add(value));
    },
    remove(...nextValues) {
      nextValues.forEach((value) => values.delete(value));
    },
    contains(value) {
      return values.has(value);
    }
  };
}

test('launchStudioEditor shows a loading autosave status until the iframe deck finishes bootstrapping', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const launchStudioEditorSource = extractFunctionSource(
    fileContent,
    'function launchStudioEditor(url, title, category) {',
    '\n\n    function closeStudioEditor() {'
  );
  const setStudioAutoSaveStatusSource = extractFunctionSource(
    fileContent,
    'function setStudioAutoSaveStatus(state) {',
    '\n\n    function resetStudioSaveButtonState() {'
  );

  const elements = {
    studioEditor: {
      classList: createClassList(['hidden']),
      style: {},
      offsetWidth: 0
    },
    studioFrame: {
      onload: null,
      src: '',
      contentDocument: null,
      contentWindow: {}
    },
    studioCategoryLabel: { textContent: '' },
    studioTitleLabel: { textContent: '' },
    autoSaveStatus: { innerHTML: 'Saved to disk' }
  };

  const loadVersionsCalls = [];
  let capturedFrameLoadOptions = null;
  const currentStudioSessionStateReaders = {
    getCurrentPresentationUrl() {
      return context.currentPresentationUrl;
    },
    getCurrentSessionToken() {
      return context.studioEditorSessionToken;
    }
  };
  const context = {
    SlideNextStudioEditorSession: {
      createStudioFrameLoadHandler(options) {
        capturedFrameLoadOptions = options;
        return function onloadHandler() {};
      }
    },
    applyCurrentPresentationMetadata(metadata) {
      context.currentPresentationMetadata = metadata;
    },
    applyEditorSelectionState() {},
    buildCurrentPresentationMetadataSeed(url, title) {
      return { url, title };
    },
    createCurrentStudioSessionStateReaders() {
      return currentStudioSessionStateReaders;
    },
    currentCategory: '',
    currentPresentationMetadata: null,
    currentPresentationUrl: '',
    currentSlideIndex: 0,
    currentTitle: '',
    updateCurrentPresentationSessionState(nextState) {
      if (Object.prototype.hasOwnProperty.call(nextState, 'presentationUrl')) {
        context.currentPresentationUrl = nextState.presentationUrl;
      }
      if (Object.prototype.hasOwnProperty.call(nextState, 'presentationTitle')) {
        context.currentTitle = nextState.presentationTitle;
      }
      if (Object.prototype.hasOwnProperty.call(nextState, 'presentationCategory')) {
        context.currentCategory = nextState.presentationCategory;
      }
      if (Object.prototype.hasOwnProperty.call(nextState, 'slideIndex')) {
        context.currentSlideIndex = nextState.slideIndex;
      }
      if (Object.prototype.hasOwnProperty.call(nextState, 'presentationMetadata')) {
        context.applyCurrentPresentationMetadata(nextState.presentationMetadata);
      }
    },
    getStudioFrame() {
      return elements.studioFrame;
    },
    document: {
      body: {
        style: {}
      },
      getElementById(id) {
        return elements[id] || null;
      }
    },
    loadCurrentPresentationMetadata() {
      return Promise.resolve();
    },
    loadVersions(presentationUrl, sessionToken) {
      loadVersionsCalls.push([presentationUrl, sessionToken]);
    },
    localStorage: {
      getItem() {
        return null;
      }
    },
    resetEditorDeckPersistenceState() {},
    resetEditorHistoryState() {},
    resetEditorPersistenceTimers() {},
    resetStudioDeckUiState() {},
    resetStudioPresentationUiState() {},
    resetStudioSaveButtonState() {},
    resetStudioSourceViewUiState() {},
    resetStudioVersionUiState() {},
    setTimeout,
    studioEditorSessionToken: 0,
    updateDeckReadyToolbarActionState() {}
  };

  vm.createContext(context);
  vm.runInContext(setStudioAutoSaveStatusSource, context);
  vm.runInContext(launchStudioEditorSource, context);

  context.launchStudioEditor('/presentations/onboarding-presentation/index.html', 'Project Onboarding', 'General');

  assert.match(elements.autoSaveStatus.innerHTML, /Loading deck/);
  assert.equal(elements.studioCategoryLabel.textContent, 'General');
  assert.equal(elements.studioTitleLabel.textContent, 'Project Onboarding');
  assert.equal(elements.studioFrame.src, '/presentations/onboarding-presentation/index.html');
  assert.equal(elements.studioEditor.classList.contains('active'), true);
  assert.equal(capturedFrameLoadOptions.getCurrentPresentationUrl, currentStudioSessionStateReaders.getCurrentPresentationUrl);
  assert.equal(capturedFrameLoadOptions.getCurrentSessionToken, currentStudioSessionStateReaders.getCurrentSessionToken);
  assert.deepEqual(loadVersionsCalls, [[
    '/presentations/onboarding-presentation/index.html',
    1
  ]]);
});

test('updateCurrentPresentationSessionState updates only the provided session fields and delegates metadata commits', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const updateCurrentPresentationSessionStateSource = extractFunctionSource(
    fileContent,
    'function updateCurrentPresentationSessionState(nextState = {}) {',
    '\n\n    function launchStudioEditor(url, title, category) {'
  );

  const metadata = { id: 'deck-1' };
  const context = {
    Object,
    currentCategory: 'General',
    currentPresentationMetadata: { id: 'seed' },
    currentPresentationUrl: '/presentations/onboarding-presentation/index.html',
    currentSlideIndex: 2,
    currentTitle: 'Project Onboarding',
    applyCurrentPresentationMetadata(nextMetadata) {
      context.currentPresentationMetadata = nextMetadata;
    }
  };

  vm.createContext(context);
  vm.runInContext(updateCurrentPresentationSessionStateSource, context);

  context.updateCurrentPresentationSessionState({
    presentationTitle: 'Renamed Deck',
    slideIndex: 4,
    presentationMetadata: metadata
  });

  assert.equal(context.currentPresentationUrl, '/presentations/onboarding-presentation/index.html');
  assert.equal(context.currentTitle, 'Renamed Deck');
  assert.equal(context.currentCategory, 'General');
  assert.equal(context.currentSlideIndex, 4);
  assert.equal(context.currentPresentationMetadata, metadata);
});

test('setStudioAutoSaveStatus renders saving and failure editor states', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const setStudioAutoSaveStatusSource = extractFunctionSource(
    fileContent,
    'function setStudioAutoSaveStatus(state) {',
    '\n\n    function resetStudioSaveButtonState() {'
  );

  const statusEl = { innerHTML: 'Saved to disk' };
  const context = {
    document: {
      getElementById(id) {
        if (id === 'autoSaveStatus') return statusEl;
        return null;
      }
    }
  };

  vm.createContext(context);
  vm.runInContext(setStudioAutoSaveStatusSource, context);

  context.setStudioAutoSaveStatus('saving');
  assert.match(statusEl.innerHTML, /Saving/);

  context.setStudioAutoSaveStatus('autosave-failed');
  assert.match(statusEl.innerHTML, /AutoSave Failed/);

  context.setStudioAutoSaveStatus('save-version-failed');
  assert.match(statusEl.innerHTML, /Save Version Failed/);

  context.setStudioAutoSaveStatus('network-error');
  assert.match(statusEl.innerHTML, /Network Error/);
});

test('closeStudioEditor reuses the shared frame accessor before clearing the editor shell state', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const closeStudioEditorSource = extractFunctionSource(
    fileContent,
    'function closeStudioEditor() {',
    '\n\n    // Initialize Frame Hooks'
  );

  const studioFrame = {
    onload: function existingHandler() {},
    src: '/presentations/onboarding-presentation/index.html'
  };
  const studioEditor = {
    classList: createClassList(['active']),
    style: {
      opacity: '1',
      pointerEvents: 'auto'
    }
  };
  let getStudioFrameCalls = 0;
  let loadPresentationsCalls = 0;

  const context = {
    currentCategory: 'General',
    currentPresentationMetadata: { id: 'deck-1' },
    currentPresentationUrl: '/presentations/onboarding-presentation/index.html',
    currentSlideIndex: 2,
    currentTitle: 'Project Onboarding',
    applyCurrentPresentationMetadata(metadata) {
      context.currentPresentationMetadata = metadata;
    },
    updateCurrentPresentationSessionState(nextState) {
      if (Object.prototype.hasOwnProperty.call(nextState, 'presentationUrl')) {
        context.currentPresentationUrl = nextState.presentationUrl;
      }
      if (Object.prototype.hasOwnProperty.call(nextState, 'presentationTitle')) {
        context.currentTitle = nextState.presentationTitle;
      }
      if (Object.prototype.hasOwnProperty.call(nextState, 'presentationCategory')) {
        context.currentCategory = nextState.presentationCategory;
      }
      if (Object.prototype.hasOwnProperty.call(nextState, 'slideIndex')) {
        context.currentSlideIndex = nextState.slideIndex;
      }
      if (Object.prototype.hasOwnProperty.call(nextState, 'presentationMetadata')) {
        context.applyCurrentPresentationMetadata(nextState.presentationMetadata);
      }
    },
    deselectElement() {},
    document: {
      body: {
        style: {
          overflow: 'hidden'
        }
      },
      getElementById(id) {
        if (id === 'studioEditor') return studioEditor;
        throw new Error(`Unexpected element lookup: ${id}`);
      }
    },
    getStudioFrame() {
      getStudioFrameCalls += 1;
      return studioFrame;
    },
    loadPresentations() {
      loadPresentationsCalls += 1;
    },
    resetEditorDeckPersistenceState() {},
    resetEditorHistoryState() {},
    resetEditorPersistenceTimers() {},
    resetStudioDeckUiState() {},
    resetStudioPresentationUiState() {},
    resetStudioSaveButtonState() {},
    resetStudioSourceViewUiState() {},
    resetStudioVersionUiState() {},
    setTimeout(callback) {
      callback();
      return 1;
    },
    studioEditorSessionToken: 4,
    teardownDeckActiveSlideSync() {},
    updateDeckReadyToolbarActionState() {}
  };

  vm.createContext(context);
  vm.runInContext(closeStudioEditorSource, context);

  context.closeStudioEditor();

  assert.equal(getStudioFrameCalls, 1);
  assert.equal(studioFrame.onload, null);
  assert.equal(studioFrame.src, '');
  assert.equal(studioEditor.classList.contains('active'), false);
  assert.equal(studioEditor.classList.contains('hidden'), true);
  assert.equal(studioEditor.style.opacity, '0');
  assert.equal(studioEditor.style.pointerEvents, 'none');
  assert.equal(context.currentPresentationUrl, '');
  assert.equal(context.currentTitle, '');
  assert.equal(context.currentCategory, '');
  assert.equal(context.currentSlideIndex, 0);
  assert.equal(context.currentPresentationMetadata, null);
  assert.equal(context.studioEditorSessionToken, 5);
  assert.equal(context.document.body.style.overflow, '');
  assert.equal(loadPresentationsCalls, 1);
});

test('loadCurrentPresentationMetadata reuses current session readers when delegating to the deck context', async () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const loadCurrentPresentationMetadataSource = extractFunctionSource(
    fileContent,
    'async function loadCurrentPresentationMetadata(',
    '\n\n    function setCurrentPresentationCanonicalDeck('
  );

  let capturedOptions = null;
  const currentStudioSessionStateReaders = {
    getCurrentPresentationUrl() {
      return context.currentPresentationUrl;
    },
    getCurrentSessionToken() {
      return context.studioEditorSessionToken;
    }
  };
  const context = {
    SlideNextStudioDeckContext: {
      async loadStudioPresentationMetadata(presentationUrl, presentationTitle, options) {
        capturedOptions = options;
        options.setCurrentPresentationMetadata({
          id: 'onboarding-presentation',
          title: presentationTitle,
          sourcePath: presentationUrl
        });
        return {
          id: 'onboarding-presentation',
          title: presentationTitle,
          sourcePath: presentationUrl
        };
      },
      resolveStoredStudioCanonicalDeck() {
        return null;
      }
    },
    createCurrentStudioSessionStateReaders() {
      return currentStudioSessionStateReaders;
    },
    currentPresentationMetadata: null,
    currentPresentationUrl: '/presentations/onboarding-presentation/index.html',
    currentTitle: 'Project Onboarding',
    applyCurrentPresentationMetadata(metadata) {
      context.currentPresentationMetadata = metadata;
      return metadata;
    },
    updateEditorPersistedDeckState() {},
    studioEditorSessionToken: 12
  };

  vm.createContext(context);
  vm.runInContext(loadCurrentPresentationMetadataSource, context);

  const metadata = await context.loadCurrentPresentationMetadata(
    '/presentations/onboarding-presentation/index.html',
    'Project Onboarding',
    12
  );

  assert.deepEqual(metadata, {
    id: 'onboarding-presentation',
    title: 'Project Onboarding',
    sourcePath: '/presentations/onboarding-presentation/index.html'
  });
  assert.equal(capturedOptions.sessionToken, 12);
  assert.equal(capturedOptions.getCurrentPresentationUrl, currentStudioSessionStateReaders.getCurrentPresentationUrl);
  assert.equal(capturedOptions.getCurrentSessionToken, currentStudioSessionStateReaders.getCurrentSessionToken);
  assert.deepEqual(context.currentPresentationMetadata, metadata);
});

test('applyCurrentPresentationMetadata refreshes the persisted canonical baseline only when requested', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const applyCurrentPresentationMetadataSource = extractFunctionSource(
    fileContent,
    'function applyCurrentPresentationMetadata(metadata, options = {}) {',
    '\n\n    function setCurrentPresentationCanonicalDeck('
  );

  const metadata = {
    id: 'onboarding-presentation',
    canonicalDeck: {
      slides: []
    }
  };
  const context = {
    SlideNextStudioDeckContext: {
      resolveStoredStudioCanonicalDeck(nextMetadata) {
        assert.equal(nextMetadata, metadata);
        return { kind: 'slidenext.deck', schemaVersion: 1, slides: [] };
      }
    },
    currentPresentationMetadata: null,
    updateEditorPersistedDeckStateCalls: [],
    updateEditorPersistedDeckState(nextState) {
      context.updateEditorPersistedDeckStateCalls.push(nextState);
    }
  };

  vm.createContext(context);
  vm.runInContext(applyCurrentPresentationMetadataSource, context);

  context.applyCurrentPresentationMetadata(metadata);
  context.applyCurrentPresentationMetadata(metadata, { syncPersistedCanonicalDeck: true });

  assert.equal(context.currentPresentationMetadata, metadata);
  assert.equal(context.updateEditorPersistedDeckStateCalls.length, 1);
  assert.equal(context.updateEditorPersistedDeckStateCalls[0].canonicalDeck.kind, 'slidenext.deck');
  assert.equal(context.updateEditorPersistedDeckStateCalls[0].canonicalDeck.schemaVersion, 1);
  assert.deepEqual(context.updateEditorPersistedDeckStateCalls[0].canonicalDeck.slides, []);
});

test('loadCurrentPresentationMetadata refreshes the persisted canonical baseline from stored metadata sidecars', async () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const loadCurrentPresentationMetadataSource = extractFunctionSource(
    fileContent,
    'async function loadCurrentPresentationMetadata(',
    '\n\n    function setCurrentPresentationCanonicalDeck('
  );

  const resolvedCanonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: []
  };
  const fetchedMetadata = {
    id: 'onboarding-presentation',
    title: 'Project Onboarding',
    sourcePath: '/presentations/onboarding-presentation/index.html',
    canonicalDeck: {
      metadata: {
        title: 'Project Onboarding'
      },
      slides: []
    }
  };

  const context = {
    SlideNextStudioDeckContext: {
      async loadStudioPresentationMetadata(presentationUrl, presentationTitle, options) {
        options.setCurrentPresentationMetadata(fetchedMetadata);
        return fetchedMetadata;
      },
      resolveStoredStudioCanonicalDeck(metadata) {
        assert.equal(metadata, fetchedMetadata);
        return resolvedCanonicalDeck;
      }
    },
    createCurrentStudioSessionStateReaders() {
      return {
        getCurrentPresentationUrl: () => context.currentPresentationUrl,
        getCurrentSessionToken: () => context.studioEditorSessionToken
      };
    },
    currentPresentationMetadata: null,
    currentPresentationUrl: '/presentations/onboarding-presentation/index.html',
    currentTitle: 'Project Onboarding',
    lastPersistedCanonicalDeck: null,
    applyCurrentPresentationMetadata(metadata, options = {}) {
      context.currentPresentationMetadata = metadata;
      if (options.syncPersistedCanonicalDeck) {
        const storedCanonicalDeck = context.SlideNextStudioDeckContext.resolveStoredStudioCanonicalDeck(metadata);
        if (storedCanonicalDeck) {
          context.updateEditorPersistedDeckState({ canonicalDeck: storedCanonicalDeck });
        }
      }
      return metadata;
    },
    updateEditorPersistedDeckState(nextState) {
      if (Object.prototype.hasOwnProperty.call(nextState, 'canonicalDeck')) {
        context.lastPersistedCanonicalDeck = nextState.canonicalDeck;
      }
    },
    studioEditorSessionToken: 12
  };

  vm.createContext(context);
  vm.runInContext(loadCurrentPresentationMetadataSource, context);

  const metadata = await context.loadCurrentPresentationMetadata(
    '/presentations/onboarding-presentation/index.html',
    'Project Onboarding',
    12
  );

  assert.equal(metadata, fetchedMetadata);
  assert.equal(context.currentPresentationMetadata, fetchedMetadata);
  assert.equal(context.lastPersistedCanonicalDeck, resolvedCanonicalDeck);
});
