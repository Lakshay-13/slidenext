const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const deckContext = require('../shared/studio-deck-context.js');
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
  const helperSource = extractFunctionSource(
    fileContent,
    'function createCurrentStudioSessionStateOptions(options = {}) {',
    '\n\n    function updateCurrentPresentationSessionState(nextState = {}) {'
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
  loadCreateCurrentStudioSessionStateOptions(fileContent, context);
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
  loadCreateCurrentStudioSessionStateOptions(fileContent, context);
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

test('createCurrentStudioSessionStateOptions exposes live session getters and forwards the session token', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  let capturedOptions = null;
  let capturedReaderOptions = null;
  const context = {
    SlideNextStudioEditorSession: {
      ...editorSession,
      createStudioSessionStateReaders(options) {
        capturedReaderOptions = options;
        return editorSession.createStudioSessionStateReaders(options);
      },
      createStudioSessionStateOptions(options) {
        capturedOptions = options;
        return editorSession.createStudioSessionStateOptions(options);
      }
    },
    currentPresentationUrl: '/presentations/onboarding-presentation/index.html',
    studioEditorSessionToken: 4
  };

  vm.createContext(context);
  loadCreateCurrentStudioSessionStateOptions(fileContent, context);

  const options = context.createCurrentStudioSessionStateOptions({ sessionToken: 4 });

  assert.equal(options.sessionToken, 4);
  assert.equal(capturedOptions.sessionToken, 4);
  assert.equal(typeof capturedReaderOptions.getCurrentPresentationUrl, 'function');
  assert.equal(typeof capturedReaderOptions.getCurrentSessionToken, 'function');
  assert.equal(typeof options.getCurrentPresentationUrl, 'function');
  assert.equal(typeof options.getCurrentSessionToken, 'function');
  assert.equal(typeof capturedOptions.getCurrentPresentationUrl, 'function');
  assert.equal(typeof capturedOptions.getCurrentSessionToken, 'function');
  assert.equal(capturedReaderOptions.getCurrentPresentationUrl(), '/presentations/onboarding-presentation/index.html');
  assert.equal(capturedReaderOptions.getCurrentSessionToken(), 4);
  assert.equal(options.getCurrentPresentationUrl(), '/presentations/onboarding-presentation/index.html');
  assert.equal(options.getCurrentSessionToken(), 4);
  assert.equal(capturedOptions.getCurrentPresentationUrl(), '/presentations/onboarding-presentation/index.html');
  assert.equal(capturedOptions.getCurrentSessionToken(), 4);

  context.currentPresentationUrl = '/presentations/ai-tools-presentation/index.html';
  context.studioEditorSessionToken = 5;
  assert.equal(capturedReaderOptions.getCurrentPresentationUrl(), '/presentations/ai-tools-presentation/index.html');
  assert.equal(capturedReaderOptions.getCurrentSessionToken(), 5);
  assert.equal(options.getCurrentPresentationUrl(), '/presentations/ai-tools-presentation/index.html');
  assert.equal(options.getCurrentSessionToken(), 5);
  assert.equal(capturedOptions.getCurrentPresentationUrl(), '/presentations/ai-tools-presentation/index.html');
  assert.equal(capturedOptions.getCurrentSessionToken(), 5);
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
  loadCreateCurrentStudioSessionStateOptions(fileContent, context);
  vm.runInContext(setStudioAutoSaveStatusSource, context);
  vm.runInContext(launchStudioEditorSource, context);

  context.launchStudioEditor('/presentations/onboarding-presentation/index.html', 'Project Onboarding', 'General');
  assert.equal(capturedFrameLoadHandlerArgs.options.presentationUrl, '/presentations/onboarding-presentation/index.html');
  assert.equal(capturedFrameLoadHandlerArgs.options.sessionToken, 1);
  assert.equal(typeof capturedFrameLoadHandlerArgs.options.afterLoad, 'function');

  capturedFrameLoadHandlerArgs.options.afterLoad();
  assert.equal(scheduledCallback.delay, 150);

  context.currentPresentationUrl = '/presentations/ai-tools-presentation/index.html';
  context.studioEditorSessionToken = 5;
  scheduledCallback.callback();

  assert.equal(capturedGuardArguments.presentationUrl, '/presentations/onboarding-presentation/index.html');
  assert.equal(capturedGuardArguments.options.sessionToken, 1);
  assert.equal(typeof capturedGuardArguments.options.getCurrentPresentationUrl, 'function');
  assert.equal(typeof capturedGuardArguments.options.getCurrentSessionToken, 'function');
  assert.equal(capturedGuardArguments.options.getCurrentPresentationUrl(), '/presentations/ai-tools-presentation/index.html');
  assert.equal(capturedGuardArguments.options.getCurrentSessionToken(), 5);
  assert.equal(typeof capturedGuardArguments.options.isEditorActive, 'function');
  assert.deepEqual(zoomCalls, ['80']);
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
  const loadCurrentPresentationMetadataSource = extractFunctionSource(
    fileContent,
    'async function loadCurrentPresentationMetadata(',
    '\n\n    function setCurrentPresentationCanonicalDeck('
  );

  let capturedOptions = null;
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
  loadCreateCurrentStudioSessionStateOptions(fileContent, context);
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

test('buildCurrentPresentationMetadataSeed falls back to the shared deck loader when the deck context helper is unavailable', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const calls = [];
  const context = {
    SlideNextStudioDeckContext: {},
    SlideNextDeckLoader: {
      buildPresentationMetadataSeed(presentationUrl, presentationTitle) {
        calls.push([presentationUrl, presentationTitle]);
        return {
          id: 'onboarding-presentation',
          title: presentationTitle,
          sourcePath: presentationUrl
        };
      }
    },
    currentPresentationUrl: '/presentations/onboarding-presentation/index.html',
    currentTitle: 'Project Onboarding'
  };

  vm.createContext(context);
  loadBuildCurrentPresentationMetadataSeed(fileContent, context);

  const metadata = context.buildCurrentPresentationMetadataSeed();

  assert.deepEqual(metadata, {
    id: 'onboarding-presentation',
    title: 'Project Onboarding',
    sourcePath: '/presentations/onboarding-presentation/index.html'
  });
  assert.deepEqual(calls, [[
    '/presentations/onboarding-presentation/index.html',
    'Project Onboarding'
  ]]);
});

test('loadCurrentPresentationMetadata falls back to the shared deck loader when the deck context loader is unavailable', async () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const loadCurrentPresentationMetadataSource = extractFunctionSource(
    fileContent,
    'async function loadCurrentPresentationMetadata(',
    '\n\n    function setCurrentPresentationCanonicalDeck('
  );

  let loaderCall = null;
  const context = {
    SlideNextStudioEditorSession: editorSession,
    SlideNextStudioDeckContext: {
      resolveStoredStudioCanonicalDeck() {
        return null;
      }
    },
    SlideNextDeckLoader: {
      async loadPresentationMetadata(presentationUrl, presentationTitle, options) {
        loaderCall = { presentationUrl, presentationTitle, options };
        return {
          id: 'onboarding-presentation',
          title: presentationTitle,
          sourcePath: presentationUrl,
          subtitle: 'Getting Started'
        };
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
  loadCreateCurrentStudioSessionStateOptions(fileContent, context);
  vm.runInContext(loadCurrentPresentationMetadataSource, context);

  const metadata = await context.loadCurrentPresentationMetadata(
    '/presentations/onboarding-presentation/index.html',
    'Project Onboarding',
    12
  );

  assert.deepEqual(metadata, {
    id: 'onboarding-presentation',
    title: 'Project Onboarding',
    sourcePath: '/presentations/onboarding-presentation/index.html',
    subtitle: 'Getting Started'
  });
  assert.deepEqual(context.currentPresentationMetadata, metadata);
  assert.equal(loaderCall.presentationUrl, '/presentations/onboarding-presentation/index.html');
  assert.equal(loaderCall.presentationTitle, 'Project Onboarding');
  assert.equal(loaderCall.options.fetchImpl, undefined);
  assert.equal(loaderCall.options.requestInit, undefined);
  assert.equal(typeof loaderCall.options.onError, 'function');
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
    getIframeDoc() {
      return { documentElement: {} };
    },
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
    syncStudioChromeToActiveSlide() {},
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
  loadCreateCurrentStudioSessionStateOptions(fileContent, context);
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
