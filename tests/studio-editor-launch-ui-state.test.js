const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const deckContext = require('../shared/studio-deck-context.js');
const editorSession = require('../shared/studio-editor-session.js');
const editorStatusView = require('../shared/studio-editor-status-view.js');
const studioPersistence = require('../shared/studio-editor-persistence.js');
const historyStackFixture = require('./helpers/studio-history-stack-fixture.js');
const autoSaveTimerFixture = require('./helpers/studio-autosave-timer-fixture.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

function extractFunctionSource(fileContent, startMarker, endMarker) {
  const historyAwareSource = historyStackFixture.extractHistoryStackAwareFunctionSource(
    fileContent,
    startMarker,
    endMarker
  );
  assert.notEqual(historyAwareSource, null, `Missing function markers: ${startMarker}`);
  return `${autoSaveTimerFixture.getAutoSaveTimerFixtureSource()}\n${historyAwareSource}`;
}

function installSlideIndexAccessor(context) {
  context.setStudioCurrentSlideIndex = (nextValue) => {
    context.currentSlideIndex = nextValue;
    return nextValue;
  };
}

function loadCreateCurrentStudioSessionStateReaders(fileContent, context) {
  const helperSource = extractFunctionSource(
    fileContent,
    'function createCurrentStudioSessionStateReaders() {',
    '\n\n    function updateCurrentPresentationSessionState(nextState = {}) {'
  );
  vm.runInContext(helperSource, context);
}

function loadCreateCurrentStudioSessionReaderOptions(fileContent, context) {
  const helperSource = extractFunctionSource(
    fileContent,
    'function createCurrentStudioSessionReaderOptions(options = {}) {',
    '\n\n    function captureCurrentStudioSessionState() {'
  );
  vm.runInContext(helperSource, context);
}

function loadCreateCurrentStudioFrameLoadHandler(fileContent, context) {
  const helperSource = extractFunctionSource(
    fileContent,
    'function createCurrentStudioFrameLoadHandler(options = {}) {',
    '\n\n    function launchStudioEditor(url, title, category) {'
  );
  vm.runInContext(helperSource, context);
}

function loadBuildCurrentPresentationMetadataSeed(fileContent, context) {
  const helperSource = extractFunctionSource(
    fileContent,
    'function buildCurrentPresentationMetadataSeed(presentationUrl = currentPresentationUrl, presentationTitle = currentTitle) {',
    '\n\n    async function loadCurrentPresentationMetadata('
  );
  vm.runInContext(helperSource, context);
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
  let capturedFrameLoadHandlerOptions = null;
  const context = {
    SlideNextStudioEditorSession: {
      ...editorSession,
      createStudioFrameLoadHandler(options) {
        capturedFrameLoadHandlerOptions = options;
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
    SlideNextStudioEditorPersistence: {
      clearStudioPersistenceTimers() {
        return {
          autoSaveDebounceTimer: null,
          autoVersionTimers: {}
        };
      }
    },
    autoSaveDebounceTimer: null,
    autoVersionTimers: {},
    applyCurrentStudioPersistedDeckState() {},
    resetStudioDeckUiState() {},
    resetStudioPresentationUiState() {},
    resetStudioSaveButtonState() {},
    resetStudioSourceViewUiState() {},
    resetStudioVersionUiState() {},
    clearTimeout() {},
    setTimeout,
    redoStack: ['redo-entry'],
    studioEditorSessionToken: 0,
    undoStack: ['undo-entry'],
    updateHistoryButtons() {},
    updateDeckReadyToolbarActionState() {}
  };

  vm.createContext(context);
  context.SlideNextStudioEditorStatusView = editorStatusView;
  loadCreateCurrentStudioSessionStateReaders(fileContent, context);
  loadCreateCurrentStudioFrameLoadHandler(fileContent, context);
  vm.runInContext(setStudioAutoSaveStatusSource, context);
  vm.runInContext(launchStudioEditorSource, context);

  context.launchStudioEditor('/presentations/onboarding-presentation/index.html', 'Project Onboarding', 'General');

  assert.match(elements.autoSaveStatus.innerHTML, /Loading deck/);
  assert.equal(elements.studioCategoryLabel.textContent, 'General');
  assert.equal(elements.studioTitleLabel.textContent, 'Project Onboarding');
  assert.equal(elements.studioFrame.src, '/presentations/onboarding-presentation/index.html');
  assert.equal(elements.studioEditor.classList.contains('active'), true);
  assert.equal(capturedFrameLoadHandlerOptions.presentationUrl, '/presentations/onboarding-presentation/index.html');
  assert.equal(capturedFrameLoadHandlerOptions.sessionToken, 1);
  assert.equal(typeof capturedFrameLoadHandlerOptions.getCurrentPresentationUrl, 'function');
  assert.equal(typeof capturedFrameLoadHandlerOptions.getCurrentSessionToken, 'function');
  assert.equal(capturedFrameLoadHandlerOptions.getCurrentPresentationUrl(), '/presentations/onboarding-presentation/index.html');
  assert.equal(capturedFrameLoadHandlerOptions.getCurrentSessionToken(), 1);
  assert.equal(typeof capturedFrameLoadHandlerOptions.isEditorActive, 'function');
  assert.deepEqual(JSON.parse(JSON.stringify(context.undoStack)), []);
  assert.deepEqual(JSON.parse(JSON.stringify(context.redoStack)), []);
  assert.deepEqual(loadVersionsCalls, [[
    '/presentations/onboarding-presentation/index.html',
    1
  ]]);
});

test('launchStudioEditor tolerates missing header labels while bootstrapping the editor shell', () => {
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
    autoSaveStatus: { innerHTML: 'Saved to disk' }
  };

  const calls = [];
  const context = {
    SlideNextStudioEditorSession: {
      ...editorSession,
      createStudioFrameLoadHandler(options) {
        calls.push(['createStudioFrameLoadHandler', options]);
        return function onloadHandler() {};
      }
    },
    applyCurrentPresentationMetadata(metadata) {
      context.currentPresentationMetadata = metadata;
    },
    applyEditorSelectionState() {
      calls.push(['applyEditorSelectionState']);
    },
    buildCurrentPresentationMetadataSeed(url, title) {
      calls.push(['buildCurrentPresentationMetadataSeed', url, title]);
      return { url, title };
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
        calls.push(['getElementById', id]);
        if (id === 'studioCategoryLabel' || id === 'studioTitleLabel') {
          return null;
        }
        return elements[id] || null;
      }
    },
    loadCurrentPresentationMetadata() {
      calls.push(['loadCurrentPresentationMetadata']);
      return Promise.resolve();
    },
    loadVersions(presentationUrl, sessionToken) {
      calls.push(['loadVersions', presentationUrl, sessionToken]);
    },
    localStorage: {
      getItem() {
        return null;
      }
    },
    SlideNextStudioEditorPersistence: {
      clearStudioPersistenceTimers() {
        calls.push(['clearStudioPersistenceTimers']);
        return {
          autoSaveDebounceTimer: null,
          autoVersionTimers: {}
        };
      }
    },
    autoSaveDebounceTimer: null,
    autoVersionTimers: {},
    applyCurrentStudioPersistedDeckState(nextState, options) {
      calls.push(['applyCurrentStudioPersistedDeckState', nextState, options]);
    },
    resetStudioDeckUiState() {
      calls.push(['resetStudioDeckUiState']);
    },
    resetStudioPresentationUiState() {
      calls.push(['resetStudioPresentationUiState']);
    },
    resetStudioSaveButtonState() {
      calls.push(['resetStudioSaveButtonState']);
    },
    resetStudioSourceViewUiState() {
      calls.push(['resetStudioSourceViewUiState']);
    },
    resetStudioVersionUiState() {
      calls.push(['resetStudioVersionUiState']);
    },
    clearTimeout() {},
    setTimeout,
    redoStack: ['redo-entry'],
    studioEditorSessionToken: 0,
    undoStack: ['undo-entry'],
    updateHistoryButtons() {
      calls.push(['updateHistoryButtons']);
    },
    updateDeckReadyToolbarActionState() {
      calls.push(['updateDeckReadyToolbarActionState']);
    }
  };

  vm.createContext(context);
  context.SlideNextStudioEditorStatusView = editorStatusView;
  loadCreateCurrentStudioSessionStateReaders(fileContent, context);
  loadCreateCurrentStudioFrameLoadHandler(fileContent, context);
  vm.runInContext(setStudioAutoSaveStatusSource, context);
  vm.runInContext(launchStudioEditorSource, context);

  assert.doesNotThrow(() => {
    context.launchStudioEditor('/presentations/onboarding-presentation/index.html', 'Project Onboarding', 'General');
  });
  assert.match(elements.autoSaveStatus.innerHTML, /Loading deck/);
  assert.equal(elements.studioFrame.src, '/presentations/onboarding-presentation/index.html');
  assert.equal(elements.studioEditor.classList.contains('active'), true);
  assert.equal(context.currentCategory, 'General');
  assert.equal(context.currentTitle, 'Project Onboarding');
  assert.ok(calls.some(([name, id]) => name === 'getElementById' && id === 'studioCategoryLabel'));
  assert.ok(calls.some(([name, id]) => name === 'getElementById' && id === 'studioTitleLabel'));
  assert.ok(calls.some(([name]) => name === 'createStudioFrameLoadHandler'));
  assert.ok(calls.some(([name, nextState, options]) => (
    name === 'applyCurrentStudioPersistedDeckState'
    && JSON.stringify(nextState) === JSON.stringify({
      cleanHtml: '',
      canonicalDeck: null,
      playbackState: null
    })
    && JSON.stringify(options) === JSON.stringify({
      presentationUrl: '',
      syncPresentationMetadata: false
    })
  )));
  assert.ok(calls.some(([name]) => name === 'updateHistoryButtons'));
  assert.deepEqual(JSON.parse(JSON.stringify(context.undoStack)), []);
  assert.deepEqual(JSON.parse(JSON.stringify(context.redoStack)), []);
  assert.ok(calls.some(([name]) => name === 'loadVersions'));
});

test('createCurrentStudioSessionStateReaders exposes live session getters through the shared reader helper', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  let capturedReaderOptions = null;
  const context = {
    SlideNextStudioEditorSession: {
      ...editorSession,
      createStudioSessionStateReaders(options) {
        capturedReaderOptions = options;
        return editorSession.createStudioSessionStateReaders(options);
      }
    },
    currentPresentationUrl: '/presentations/onboarding-presentation/index.html',
    studioEditorSessionToken: 4
  };

  vm.createContext(context);
  loadCreateCurrentStudioSessionStateReaders(fileContent, context);

  const readers = context.createCurrentStudioSessionStateReaders();

  assert.equal(typeof capturedReaderOptions.getCurrentPresentationUrl, 'function');
  assert.equal(typeof capturedReaderOptions.getCurrentSessionToken, 'function');
  assert.equal(typeof readers.getCurrentPresentationUrl, 'function');
  assert.equal(typeof readers.getCurrentSessionToken, 'function');
  assert.equal(capturedReaderOptions.getCurrentPresentationUrl(), '/presentations/onboarding-presentation/index.html');
  assert.equal(capturedReaderOptions.getCurrentSessionToken(), 4);
  assert.equal(readers.getCurrentPresentationUrl(), '/presentations/onboarding-presentation/index.html');
  assert.equal(readers.getCurrentSessionToken(), 4);

  context.currentPresentationUrl = '/presentations/ai-tools-presentation/index.html';
  context.studioEditorSessionToken = 5;
  assert.equal(capturedReaderOptions.getCurrentPresentationUrl(), '/presentations/ai-tools-presentation/index.html');
  assert.equal(capturedReaderOptions.getCurrentSessionToken(), 5);
  assert.equal(readers.getCurrentPresentationUrl(), '/presentations/ai-tools-presentation/index.html');
  assert.equal(readers.getCurrentSessionToken(), 5);
});

test('createCurrentStudioSessionStateReaders creates the shared reader adapter once', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  let adapterCreateCalls = 0;
  const context = {
    SlideNextStudioEditorSession: {
      createStudioEditorSessionStateReadersAdapter(options) {
        adapterCreateCalls += 1;
        return editorSession.createStudioEditorSessionStateReadersAdapter(options);
      }
    },
    currentPresentationUrl: '/presentations/onboarding-presentation/index.html',
    studioEditorSessionToken: 4
  };

  vm.createContext(context);
  loadCreateCurrentStudioSessionStateReaders(fileContent, context);

  const firstReaders = context.createCurrentStudioSessionStateReaders();
  context.currentPresentationUrl = '/presentations/ai-tools-presentation/index.html';
  context.studioEditorSessionToken = 5;
  const secondReaders = context.createCurrentStudioSessionStateReaders();

  assert.equal(adapterCreateCalls, 1);
  assert.equal(firstReaders.getCurrentPresentationUrl(), '/presentations/ai-tools-presentation/index.html');
  assert.equal(firstReaders.getCurrentSessionToken(), 5);
  assert.equal(secondReaders.getCurrentPresentationUrl(), '/presentations/ai-tools-presentation/index.html');
  assert.equal(secondReaders.getCurrentSessionToken(), 5);
});

test('createCurrentStudioSessionReaderOptions reuses the shared session-reader options builder when available', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  let delegatedArgs = null;
  const context = {
    createCurrentStudioSessionStateReaders() {
      return {
        getCurrentPresentationUrl: () => '/presentations/onboarding-presentation/index.html',
        getCurrentSessionToken: () => 12
      };
    },
    SlideNextStudioEditorSession: {
      ...editorSession,
      createStudioEditorSessionReaderOptionsAdapter(options = {}) {
        delegatedArgs = options;
        return editorSession.createStudioEditorSessionReaderOptionsAdapter(options);
      },
      createStudioSessionReaderOptionsBuilder(options = {}) {
        const sessionStateReaders = options.readCurrentSessionState();
        return (nextOptions = {}) => ({
          getCurrentPresentationUrl: sessionStateReaders.getCurrentPresentationUrl,
          getCurrentSessionToken: sessionStateReaders.getCurrentSessionToken,
          onLoad: nextOptions.onLoad,
          readCurrentSessionState: typeof options.readCurrentSessionState
        });
      }
    }
  };

  vm.createContext(context);
  loadCreateCurrentStudioSessionReaderOptions(fileContent, context);

  const sessionReaderOptions = context.createCurrentStudioSessionReaderOptions({
    onLoad: 'load-sentinel'
  });

  assert.deepEqual(
    JSON.parse(JSON.stringify({
      presentationUrl: sessionReaderOptions.getCurrentPresentationUrl(),
      sessionToken: sessionReaderOptions.getCurrentSessionToken(),
      onLoad: sessionReaderOptions.onLoad,
      readCurrentSessionState: sessionReaderOptions.readCurrentSessionState
    })),
    {
      presentationUrl: '/presentations/onboarding-presentation/index.html',
      sessionToken: 12,
      onLoad: 'load-sentinel',
      readCurrentSessionState: 'function'
    }
  );
  assert.equal(delegatedArgs.readCurrentSessionState, context.createCurrentStudioSessionStateReaders);
});

test('createCurrentStudioSessionReaderOptions creates the shared reader-options adapter once', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  let adapterCreateCalls = 0;
  const context = {
    currentPresentationUrl: '/presentations/onboarding-presentation/index.html',
    studioEditorSessionToken: 12,
    createCurrentStudioSessionStateReaders() {
      return {
        getCurrentPresentationUrl: () => context.currentPresentationUrl,
        getCurrentSessionToken: () => context.studioEditorSessionToken
      };
    },
    SlideNextStudioEditorSession: {
      createStudioEditorSessionReaderOptionsAdapter(options) {
        adapterCreateCalls += 1;
        return editorSession.createStudioEditorSessionReaderOptionsAdapter(options);
      }
    }
  };

  vm.createContext(context);
  loadCreateCurrentStudioSessionReaderOptions(fileContent, context);

  const firstOptions = context.createCurrentStudioSessionReaderOptions({ onLoad: 'first' });
  context.currentPresentationUrl = '/presentations/ai-tools-presentation/index.html';
  context.studioEditorSessionToken = 13;
  const secondOptions = context.createCurrentStudioSessionReaderOptions({ onLoad: 'second' });

  assert.equal(adapterCreateCalls, 1);
  assert.equal(firstOptions.onLoad, 'first');
  assert.equal(firstOptions.getCurrentPresentationUrl(), '/presentations/ai-tools-presentation/index.html');
  assert.equal(firstOptions.getCurrentSessionToken(), 13);
  assert.equal(secondOptions.onLoad, 'second');
  assert.equal(secondOptions.getCurrentPresentationUrl(), '/presentations/ai-tools-presentation/index.html');
  assert.equal(secondOptions.getCurrentSessionToken(), 13);
});

test('createCurrentStudioPresentationMetadataLoadOptions merges live session readers with metadata sync behavior', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const helperSource = extractFunctionSource(
    fileContent,
    'function createCurrentStudioPresentationMetadataLoadOptions(sessionToken = studioEditorSessionToken) {',
    '\n\n    async function loadCurrentPresentationMetadata('
  );

  let readerCallCount = 0;
  let capturedReaders = null;
  const warningCalls = [];
  const context = {
    applyCurrentPresentationMetadataCalls: [],
    applyCurrentPresentationMetadata(metadata, options) {
      context.applyCurrentPresentationMetadataCalls.push([metadata, options]);
      return metadata;
    },
    console: {
      warn(...args) {
        warningCalls.push(args);
      }
    },
    createCurrentStudioSessionStateReaders() {
      readerCallCount += 1;
      capturedReaders = {
        getCurrentPresentationUrl: () => context.currentPresentationUrl,
        getCurrentSessionToken: () => context.studioEditorSessionToken
      };
      return capturedReaders;
    },
    currentPresentationUrl: '/presentations/onboarding-presentation/index.html',
    studioEditorSessionToken: 12
  };

  vm.createContext(context);
  loadCreateCurrentStudioSessionReaderOptions(fileContent, context);
  vm.runInContext(helperSource, context);

  const options = context.createCurrentStudioPresentationMetadataLoadOptions(12);

  assert.equal(readerCallCount, 1);
  assert.equal(options.sessionToken, 12);
  assert.equal(options.getCurrentPresentationUrl, capturedReaders.getCurrentPresentationUrl);
  assert.equal(options.getCurrentSessionToken, capturedReaders.getCurrentSessionToken);
  assert.equal(options.getCurrentPresentationUrl(), '/presentations/onboarding-presentation/index.html');
  assert.equal(options.getCurrentSessionToken(), 12);

  const metadata = {
    id: 'onboarding-presentation',
    title: 'Project Onboarding',
    sourcePath: '/presentations/onboarding-presentation/index.html'
  };
  options.setCurrentPresentationMetadata(metadata);
  assert.equal(context.applyCurrentPresentationMetadataCalls.length, 1);
  assert.equal(context.applyCurrentPresentationMetadataCalls[0][0], metadata);
  assert.equal(
    context.applyCurrentPresentationMetadataCalls[0][1].syncPersistedCanonicalDeck,
    true
  );

  options.onError(new Error('missing sidecar'), '/presentations/onboarding-presentation/presentation.json');
  assert.equal(warningCalls.length, 1);
  assert.match(String(warningCalls[0][0]), /Failed to load presentation metadata/);

  context.currentPresentationUrl = '/presentations/ai-tools-presentation/index.html';
  context.studioEditorSessionToken = 13;
  assert.equal(options.getCurrentPresentationUrl(), '/presentations/ai-tools-presentation/index.html');
  assert.equal(options.getCurrentSessionToken(), 13);
});

test('launchStudioEditor after-load zoom guard passes live session getters to the editor session helper', () => {
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

  let capturedFrameLoadHandlerArgs = null;
  let capturedGuardArguments = null;
  let readerCallCount = 0;
  const capturedReaders = [];
  let scheduledCallback = null;
  const zoomCalls = [];
  const context = {
    SlideNextStudioEditorSession: {
      ...editorSession,
      createStudioFrameLoadHandler(options) {
        capturedFrameLoadHandlerArgs = { options };
        return function onloadHandler() {};
      },
      shouldHandleStudioFrameLoad(presentationUrl, options) {
        capturedGuardArguments = { presentationUrl, options };
        return true;
      }
    },
    SlideNextStudioEditorPersistence: {
      clearStudioPersistenceTimers() {
        return {
          autoSaveDebounceTimer: null,
          autoVersionTimers: {}
        };
      }
    },
    applyCurrentPresentationMetadata(metadata) {
      context.currentPresentationMetadata = metadata;
    },
    applyCurrentStudioPersistedDeckState() {},
    applyEditorSelectionState() {},
    applyZoom(value) {
      zoomCalls.push(value);
    },
    autoSaveDebounceTimer: null,
    autoVersionTimers: {},
    buildCurrentPresentationMetadataSeed(url, title) {
      return { url, title };
    },
    clearTimeout() {},
    currentCategory: '',
    currentPresentationMetadata: null,
    currentPresentationUrl: '',
    currentSlideIndex: 0,
    currentTitle: '',
    createCurrentStudioSessionStateReaders() {
      readerCallCount += 1;
      const readers = {
        getCurrentPresentationUrl: () => context.currentPresentationUrl,
        getCurrentSessionToken: () => context.studioEditorSessionToken
      };
      capturedReaders.push(readers);
      return readers;
    },
    document: {
      body: {
        style: {}
      },
      getElementById(id) {
        return elements[id] || null;
      }
    },
    getStudioFrame() {
      return elements.studioFrame;
    },
    loadCurrentPresentationMetadata() {
      return Promise.resolve();
    },
    loadVersions() {},
    localStorage: {
      getItem(key) {
        assert.equal(key, 'presentationZoom');
        return '80';
      }
    },
    redoStack: ['redo-entry'],
    resetStudioDeckUiState() {},
    resetStudioPresentationUiState() {},
    resetStudioSaveButtonState() {},
    resetStudioSourceViewUiState() {},
    resetStudioVersionUiState() {},
    setTimeout(callback, delay) {
      scheduledCallback = { callback, delay };
      return 1;
    },
    studioEditorSessionToken: 0,
    undoStack: ['undo-entry'],
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
    updateDeckReadyToolbarActionState() {},
    updateHistoryButtons() {}
  };

  vm.createContext(context);
  context.SlideNextStudioEditorStatusView = editorStatusView;
  loadCreateCurrentStudioFrameLoadHandler(fileContent, context);
  vm.runInContext(setStudioAutoSaveStatusSource, context);
  vm.runInContext(launchStudioEditorSource, context);

  context.launchStudioEditor('/presentations/onboarding-presentation/index.html', 'Project Onboarding', 'General');
  assert.equal(capturedFrameLoadHandlerArgs.options.presentationUrl, '/presentations/onboarding-presentation/index.html');
  assert.equal(capturedFrameLoadHandlerArgs.options.sessionToken, 1);
  assert.equal(readerCallCount, 1);
  assert.equal(capturedFrameLoadHandlerArgs.options.getCurrentPresentationUrl, capturedReaders[0].getCurrentPresentationUrl);
  assert.equal(capturedFrameLoadHandlerArgs.options.getCurrentSessionToken, capturedReaders[0].getCurrentSessionToken);
  assert.equal(typeof capturedFrameLoadHandlerArgs.options.afterLoad, 'function');

  capturedFrameLoadHandlerArgs.options.afterLoad();
  assert.equal(scheduledCallback.delay, 150);

  context.currentPresentationUrl = '/presentations/ai-tools-presentation/index.html';
  context.studioEditorSessionToken = 5;
  scheduledCallback.callback();

  assert.equal(readerCallCount, 1);
  assert.equal(capturedGuardArguments.presentationUrl, '/presentations/onboarding-presentation/index.html');
  assert.equal(capturedGuardArguments.options.sessionToken, 1);
  assert.equal(capturedGuardArguments.options.getCurrentPresentationUrl, capturedReaders[0].getCurrentPresentationUrl);
  assert.equal(capturedGuardArguments.options.getCurrentSessionToken, capturedReaders[0].getCurrentSessionToken);
  assert.equal(typeof capturedGuardArguments.options.getCurrentPresentationUrl, 'function');
  assert.equal(typeof capturedGuardArguments.options.getCurrentSessionToken, 'function');
  assert.equal(capturedGuardArguments.options.getCurrentPresentationUrl(), '/presentations/ai-tools-presentation/index.html');
  assert.equal(capturedGuardArguments.options.getCurrentSessionToken(), 5);
  assert.equal(typeof capturedGuardArguments.options.isEditorActive, 'function');
  assert.deepEqual(zoomCalls, ['80']);
});

test('shouldHandleCurrentStudioFrameLoad creates the shared frame-load guard adapter once', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const shouldHandleCurrentStudioFrameLoadSource = extractFunctionSource(
    fileContent,
    'function shouldHandleCurrentStudioFrameLoad(expectedPresentationUrl = \'\', options = {}) {',
    '\n\n    function launchStudioEditor(url, title, category) {'
  );
  let adapterCreateCalls = 0;
  const calls = [];
  const context = {
    SlideNextStudioEditorSession: {
      createStudioEditorFrameLoadGuardAdapter() {
        adapterCreateCalls += 1;
        return (presentationUrl, options) => {
          calls.push([presentationUrl, options]);
          return options.allowed;
        };
      }
    }
  };

  vm.createContext(context);
  vm.runInContext(shouldHandleCurrentStudioFrameLoadSource, context);

  assert.equal(
    context.shouldHandleCurrentStudioFrameLoad('/presentations/one/index.html', { allowed: true }),
    true
  );
  assert.equal(
    context.shouldHandleCurrentStudioFrameLoad('/presentations/two/index.html', { allowed: false }),
    false
  );
  assert.equal(adapterCreateCalls, 1);
  assert.deepEqual(calls.map(([presentationUrl]) => presentationUrl), [
    '/presentations/one/index.html',
    '/presentations/two/index.html'
  ]);
});

test('createCurrentStudioFrameLoadHandler creates the shared frame-load handler adapter once', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  let adapterCreateCalls = 0;
  const context = {
    SlideNextStudioEditorSession: {
      createStudioEditorFrameLoadHandlerAdapter() {
        adapterCreateCalls += 1;
        return (options) => ({ presentationUrl: options.presentationUrl });
      }
    }
  };

  vm.createContext(context);
  loadCreateCurrentStudioFrameLoadHandler(fileContent, context);

  assert.deepEqual(
    context.createCurrentStudioFrameLoadHandler({ presentationUrl: '/presentations/one/index.html' }),
    { presentationUrl: '/presentations/one/index.html' }
  );
  assert.deepEqual(
    context.createCurrentStudioFrameLoadHandler({ presentationUrl: '/presentations/two/index.html' }),
    { presentationUrl: '/presentations/two/index.html' }
  );
  assert.equal(adapterCreateCalls, 1);
});

test('updateCurrentPresentationSessionState updates only the provided session fields and delegates metadata commits', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const updateCurrentPresentationSessionStateSource = extractFunctionSource(
    fileContent,
    'function updateCurrentPresentationSessionState(nextState = {}) {',
    '\n\n    function launchStudioEditor(url, title, category) {'
  );

  const metadata = { id: 'deck-1' };
  let capturedStateUpdate = null;
  const context = {
    Object,
    SlideNextStudioEditorSession: {
      ...editorSession,
      createStudioPresentationSessionStateUpdate(nextState) {
        capturedStateUpdate = nextState;
        return editorSession.createStudioPresentationSessionStateUpdate(nextState);
      }
    },
    currentCategory: 'General',
    currentPresentationMetadata: { id: 'seed' },
    currentPresentationUrl: '/presentations/onboarding-presentation/index.html',
    currentSlideIndex: 2,
    currentTitle: 'Project Onboarding',
    applyCurrentPresentationMetadata(nextMetadata) {
      context.currentPresentationMetadata = nextMetadata;
    }
  };
  installSlideIndexAccessor(context);

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
  assert.deepEqual(capturedStateUpdate, {
    presentationTitle: 'Renamed Deck',
    slideIndex: 4,
    presentationMetadata: metadata
  });
});

test('updateCurrentPresentationSessionState delegates normalization through the editor session adapter', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const updateCurrentPresentationSessionStateSource = extractFunctionSource(
    fileContent,
    'function updateCurrentPresentationSessionState(nextState = {}) {',
    '\n\n    function launchStudioEditor(url, title, category) {'
  );
  let adapterOptions = null;
  const metadata = { id: 'deck-1' };
  const context = {
    SlideNextStudioEditorSession: {
      createStudioEditorPresentationSessionStateUpdateAdapter(options = {}) {
        adapterOptions = options;
        return (nextState) => ({
          presentationTitle: nextState.presentationTitle,
          slideIndex: nextState.slideIndex,
          presentationMetadata: nextState.presentationMetadata
        });
      },
      createStudioPresentationSessionStateUpdate() {
        throw new Error('direct session normalization should not run when the adapter exists');
      }
    },
    currentCategory: 'General',
    currentPresentationMetadata: { id: 'seed' },
    currentPresentationUrl: '/presentations/onboarding-presentation/index.html',
    currentSlideIndex: 2,
    currentTitle: 'Project Onboarding',
    applyCurrentPresentationMetadata(nextMetadata) {
      context.currentPresentationMetadata = nextMetadata;
    }
  };
  installSlideIndexAccessor(context);

  vm.createContext(context);
  vm.runInContext(updateCurrentPresentationSessionStateSource, context);

  context.updateCurrentPresentationSessionState({
    presentationTitle: 'Renamed Deck',
    slideIndex: 4,
    presentationMetadata: metadata
  });

  assert.equal(context.currentTitle, 'Renamed Deck');
  assert.equal(context.currentSlideIndex, 4);
  assert.equal(context.currentPresentationMetadata, metadata);
  assert.equal(adapterOptions.sessionApi, context.SlideNextStudioEditorSession);
});

test('updateCurrentPresentationSessionState creates the shared session update adapter once', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  let adapterCreateCalls = 0;
  const context = {
    SlideNextStudioEditorSession: {
      createStudioEditorPresentationSessionStateUpdateAdapter() {
        adapterCreateCalls += 1;
        return (nextState) => ({ presentationTitle: nextState.presentationTitle });
      }
    },
    currentCategory: 'General',
    currentPresentationMetadata: null,
    currentPresentationUrl: '/presentations/onboarding-presentation/index.html',
    currentSlideIndex: 0,
    currentTitle: 'Project Onboarding',
    applyCurrentPresentationMetadata() {}
  };

  vm.createContext(context);
  const updateCurrentPresentationSessionStateSource = extractFunctionSource(
    fileContent,
    'function updateCurrentPresentationSessionState(nextState = {}) {',
    '\n\n    function launchStudioEditor(url, title, category) {'
  );
  vm.runInContext(updateCurrentPresentationSessionStateSource, context);

  context.updateCurrentPresentationSessionState({ presentationTitle: 'First Deck' });
  context.updateCurrentPresentationSessionState({ presentationTitle: 'Second Deck' });

  assert.equal(adapterCreateCalls, 1);
  assert.equal(context.currentTitle, 'Second Deck');
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
  context.SlideNextStudioEditorStatusView = editorStatusView;
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
  const calls = [];

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
    SlideNextStudioEditorPersistence: {
      clearStudioPersistenceTimers() {
        return {
          autoSaveDebounceTimer: null,
          autoVersionTimers: {}
        };
      }
    },
    autoSaveDebounceTimer: null,
    autoVersionTimers: {},
    applyCurrentStudioPersistedDeckState(nextState, options) {
      calls.push(['applyCurrentStudioPersistedDeckState', nextState, options]);
    },
    resetStudioDeckUiState() {},
    resetStudioPresentationUiState() {},
    resetStudioSaveButtonState() {},
    resetStudioSourceViewUiState() {},
    resetStudioVersionUiState() {},
    clearTimeout() {},
    redoStack: ['redo-entry'],
    setTimeout(callback) {
      callback();
      return 1;
    },
    studioEditorSessionToken: 4,
    teardownDeckActiveSlideSync() {},
    undoStack: ['undo-entry'],
    updateHistoryButtons() {},
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
  assert.ok(calls.some(([name, nextState, options]) => (
    name === 'applyCurrentStudioPersistedDeckState'
    && JSON.stringify(nextState) === JSON.stringify({
      cleanHtml: '',
      canonicalDeck: null,
      playbackState: null
    })
    && JSON.stringify(options) === JSON.stringify({
      presentationUrl: '',
      syncPresentationMetadata: false
    })
  )));
  assert.deepEqual(JSON.parse(JSON.stringify(context.undoStack)), []);
  assert.deepEqual(JSON.parse(JSON.stringify(context.redoStack)), []);
  assert.equal(loadPresentationsCalls, 1);
});

test('loadCurrentPresentationMetadata passes live session getters when delegating to the deck context', async () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const helperSource = extractFunctionSource(
    fileContent,
    'function createCurrentStudioPresentationMetadataLoadOptions(sessionToken = studioEditorSessionToken) {',
    '\n\n    async function loadCurrentPresentationMetadata('
  );
  const loadCurrentPresentationMetadataSource = extractFunctionSource(
    fileContent,
    'async function loadCurrentPresentationMetadata(',
    '\n\n    function setCurrentPresentationCanonicalDeck('
  );

  let capturedOptions = null;
  let readerCallCount = 0;
  let capturedReaders = null;
  const context = {
    SlideNextStudioEditorSession: editorSession,
    SlideNextStudioDeckContext: {
      ...deckContext,
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
      readerCallCount += 1;
      capturedReaders = {
        getCurrentPresentationUrl: () => context.currentPresentationUrl,
        getCurrentSessionToken: () => context.studioEditorSessionToken
      };
      return capturedReaders;
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
  loadCreateCurrentStudioSessionReaderOptions(fileContent, context);
  vm.runInContext(helperSource, context);
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
  assert.equal(readerCallCount, 1);
  assert.equal(capturedOptions.sessionToken, 12);
  assert.equal(capturedOptions.getCurrentPresentationUrl, capturedReaders.getCurrentPresentationUrl);
  assert.equal(capturedOptions.getCurrentSessionToken, capturedReaders.getCurrentSessionToken);
  assert.equal(typeof capturedOptions.getCurrentPresentationUrl, 'function');
  assert.equal(typeof capturedOptions.getCurrentSessionToken, 'function');
  assert.equal(capturedOptions.getCurrentPresentationUrl(), '/presentations/onboarding-presentation/index.html');
  assert.equal(capturedOptions.getCurrentSessionToken(), 12);
  assert.deepEqual(context.currentPresentationMetadata, metadata);

  context.currentPresentationUrl = '/presentations/ai-tools-presentation/index.html';
  context.studioEditorSessionToken = 13;
  assert.equal(capturedOptions.getCurrentPresentationUrl(), '/presentations/ai-tools-presentation/index.html');
  assert.equal(capturedOptions.getCurrentSessionToken(), 13);
});

test('buildCurrentPresentationMetadataSeed fails closed when the deck context helper is unavailable', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const context = {
    SlideNextStudioDeckContext: {},
    SlideNextDeckLoader: {
      buildPresentationMetadataSeed() {
        throw new Error('buildPresentationMetadataSeed should remain owned by the shared deck context');
      }
    },
    currentPresentationUrl: '/presentations/onboarding-presentation/index.html',
    currentTitle: 'Project Onboarding'
  };

  vm.createContext(context);
  loadBuildCurrentPresentationMetadataSeed(fileContent, context);

  const metadata = context.buildCurrentPresentationMetadataSeed();

  assert.equal(metadata, null);
});

test('loadCurrentPresentationMetadata fails closed when the deck context loader is unavailable', async () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const helperSource = extractFunctionSource(
    fileContent,
    'function createCurrentStudioPresentationMetadataLoadOptions(sessionToken = studioEditorSessionToken) {',
    '\n\n    async function loadCurrentPresentationMetadata('
  );
  const loadCurrentPresentationMetadataSource = extractFunctionSource(
    fileContent,
    'async function loadCurrentPresentationMetadata(',
    '\n\n    function setCurrentPresentationCanonicalDeck('
  );

  const context = {
    SlideNextStudioEditorSession: editorSession,
    SlideNextStudioDeckContext: {
      resolveStoredStudioCanonicalDeck() {
        return null;
      }
    },
    SlideNextDeckLoader: {
      async loadPresentationMetadata() {
        throw new Error('loadPresentationMetadata should remain owned by the shared deck context');
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
    studioEditorSessionToken: 12,
    updateEditorPersistedDeckState() {}
  };

  vm.createContext(context);
  loadCreateCurrentStudioSessionStateReaders(fileContent, context);
  loadCreateCurrentStudioSessionReaderOptions(fileContent, context);
  vm.runInContext(helperSource, context);
  vm.runInContext(loadCurrentPresentationMetadataSource, context);

  const metadata = await context.loadCurrentPresentationMetadata(
    '/presentations/onboarding-presentation/index.html',
    'Project Onboarding',
    12
  );

  assert.equal(metadata, null);
  assert.equal(context.currentPresentationMetadata, null);
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
    SlideNextStudioEditorSession: editorSession,
    SlideNextStudioDeckContext: {
      resolveStoredStudioCanonicalDeck(nextMetadata) {
        assert.equal(nextMetadata, metadata);
        return { kind: 'slidenext.deck', schemaVersion: 1, slides: [] };
      }
    },
    currentPresentationMetadata: null,
    currentPresentationUrl: '/presentations/onboarding-presentation/index.html',
    generateThumbnails() {},
    getIframeDoc() {
      return { documentElement: {} };
    },
    setCurrentPresentationCanonicalDeck() {},
    syncStudioChromeToActiveSlide() {},
    updateDeckReadyToolbarActionState() {},
    SlideNextStudioEditorPersistence: studioPersistence,
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

test('applyCurrentPresentationMetadata fails closed when shared persistence is unavailable', () => {
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
  let updateCalls = 0;
  const context = {
    SlideNextStudioEditorPersistence: {},
    currentPresentationMetadata: null,
    currentPresentationUrl: '/presentations/onboarding-presentation/index.html',
    updateEditorPersistedDeckState() {
      updateCalls += 1;
    }
  };

  vm.createContext(context);
  vm.runInContext(applyCurrentPresentationMetadataSource, context);

  assert.equal(
    context.applyCurrentPresentationMetadata(metadata, { syncPersistedCanonicalDeck: true }),
    metadata
  );
  assert.equal(context.currentPresentationMetadata, metadata);
  assert.equal(updateCalls, 0);
});

test('applyCurrentPresentationMetadata refreshes fallback deck chrome from stored canonical metadata when the iframe is unavailable', () => {
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
  const resolvedCanonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: [
      {
        id: 'slide-1',
        nodes: []
      }
    ]
  };
  const callLog = [];
  const context = {
    SlideNextStudioEditorSession: editorSession,
    SlideNextStudioDeckContext: {
      resolveStoredStudioCanonicalDeck(nextMetadata) {
        assert.equal(nextMetadata, metadata);
        return resolvedCanonicalDeck;
      }
    },
    currentPresentationMetadata: null,
    currentPresentationUrl: '/presentations/onboarding-presentation/index.html',
    generateThumbnails() {
      callLog.push('generateThumbnails');
    },
    getIframeDoc() {
      callLog.push('getIframeDoc');
      return null;
    },
    syncStudioChromeToActiveSlide(nextDoc) {
      callLog.push(['syncStudioChromeToActiveSlide', nextDoc]);
    },
    updateDeckReadyToolbarActionState(nextDoc) {
      callLog.push(['updateDeckReadyToolbarActionState', nextDoc]);
    },
    setCurrentPresentationCanonicalDeck() {},
    SlideNextStudioEditorPersistence: studioPersistence,
    updateEditorPersistedDeckState(nextState) {
      callLog.push(['updateEditorPersistedDeckState', nextState]);
    },
    updateLayersList() {
      callLog.push('updateLayersList');
    }
  };

  vm.createContext(context);
  vm.runInContext(applyCurrentPresentationMetadataSource, context);

  context.applyCurrentPresentationMetadata(metadata, { syncPersistedCanonicalDeck: true });

  assert.equal(context.currentPresentationMetadata, metadata);
  assert.equal(callLog.length, 5);
  assert.equal(callLog[0][0], 'updateEditorPersistedDeckState');
  assert.equal(callLog[0][1].canonicalDeck, resolvedCanonicalDeck);
  assert.equal(callLog[1], 'getIframeDoc');
  assert.equal(callLog[2], 'generateThumbnails');
  assert.deepEqual(callLog[3], ['syncStudioChromeToActiveSlide', null]);
  assert.deepEqual(callLog[4], ['updateDeckReadyToolbarActionState', null]);
});

test('applyCurrentPresentationMetadata delegates persisted canonical baseline sync through the shared persistence helper when available', () => {
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
  let helperCall = null;
  const context = {
    SlideNextStudioEditorPersistence: {
      syncStudioPresentationMetadataPersistedCanonicalDeck(nextMetadata, options = {}) {
        helperCall = {
          nextMetadata,
          presentationUrl: options.presentationUrl,
          hasResolveStoredCanonicalDeck: typeof options.resolveStoredCanonicalDeck === 'function',
          hasApplyPersistedDeckState: typeof options.applyPersistedDeckState === 'function',
          hasGetIframeDoc: typeof options.getIframeDoc === 'function',
          hasGenerateThumbnails: typeof options.generateThumbnails === 'function',
          hasSyncStudioChromeToActiveSlide: typeof options.syncStudioChromeToActiveSlide === 'function',
          hasUpdateDeckReadyToolbarActionState: typeof options.updateDeckReadyToolbarActionState === 'function'
        };
        return {
          kind: 'slidenext.deck',
          schemaVersion: 1,
          slides: []
        };
      }
    },
    SlideNextStudioDeckContext: {
      resolveStoredStudioCanonicalDeck() {
        throw new Error('resolveStoredStudioCanonicalDeck should be delegated through the shared persistence helper');
      }
    },
    currentPresentationMetadata: null,
    currentPresentationUrl: '/presentations/onboarding-presentation/index.html',
    generateThumbnails() {
      throw new Error('generateThumbnails should be delegated through the shared persistence helper');
    },
    getIframeDoc() {
      throw new Error('getIframeDoc should be delegated through the shared persistence helper');
    },
    syncStudioChromeToActiveSlide() {
      throw new Error('syncStudioChromeToActiveSlide should be delegated through the shared persistence helper');
    },
    updateDeckReadyToolbarActionState() {
      throw new Error('updateDeckReadyToolbarActionState should be delegated through the shared persistence helper');
    },
    updateEditorPersistedDeckState() {
      throw new Error('updateEditorPersistedDeckState should be delegated through the shared persistence helper');
    }
  };

  vm.createContext(context);
  vm.runInContext(applyCurrentPresentationMetadataSource, context);

  const result = context.applyCurrentPresentationMetadata(metadata, { syncPersistedCanonicalDeck: true });

  assert.equal(result, metadata);
  assert.equal(context.currentPresentationMetadata, metadata);
  assert.deepEqual(helperCall, {
    nextMetadata: metadata,
    presentationUrl: '/presentations/onboarding-presentation/index.html',
    hasResolveStoredCanonicalDeck: true,
    hasApplyPersistedDeckState: true,
    hasGetIframeDoc: true,
    hasGenerateThumbnails: true,
    hasSyncStudioChromeToActiveSlide: true,
    hasUpdateDeckReadyToolbarActionState: true
  });
});

test('loadCurrentPresentationMetadata refreshes the persisted canonical baseline from stored metadata sidecars', async () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const helperSource = extractFunctionSource(
    fileContent,
    'function createCurrentStudioPresentationMetadataLoadOptions(sessionToken = studioEditorSessionToken) {',
    '\n\n    async function loadCurrentPresentationMetadata('
  );
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
    SlideNextStudioEditorSession: editorSession,
    SlideNextStudioDeckContext: {
      ...deckContext,
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
    generateThumbnails() {},
    getIframeDoc() {
      return { documentElement: {} };
    },
    lastPersistedCanonicalDeck: null,
    setCurrentPresentationCanonicalDeck() {},
    syncStudioChromeToActiveSlide() {},
    SlideNextStudioEditorPersistence: studioPersistence,
    updateDeckReadyToolbarActionState() {},
    updateEditorPersistedDeckState(nextState) {
      if (Object.prototype.hasOwnProperty.call(nextState, 'canonicalDeck')) {
        context.lastPersistedCanonicalDeck = nextState.canonicalDeck;
      }
    },
    updateLayersList() {},
    studioEditorSessionToken: 12
  };

  vm.createContext(context);
  loadCreateCurrentStudioSessionStateReaders(fileContent, context);
  loadCreateCurrentStudioSessionReaderOptions(fileContent, context);
  vm.runInContext(helperSource, context);
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
