const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');
const canonicalDeckModel = require('../shared/canonical-deck.js');
const editorPersistence = require('../shared/studio-editor-persistence.js');

function extractFunctionSource(fileContent, startMarker, endMarker) {
  const start = fileContent.indexOf(startMarker);
  assert.notEqual(start, -1, `Missing start marker: ${startMarker}`);
  const end = fileContent.indexOf(endMarker, start);
  assert.notEqual(end, -1, `Missing end marker: ${endMarker}`);
  return fileContent.slice(start, end);
}

function loadCaptureEditorPersistableDeckState(fileContent, context) {
  const captureEditorPersistableDeckStateSource = extractFunctionSource(
    fileContent,
    'function captureEditorPersistableDeckState(doc = getIframeDoc()) {',
    '\n\n    function capturePersistedDeckPlaybackState(doc = getIframeDoc(), canonicalDeck = null) {'
  );
  vm.runInContext(captureEditorPersistableDeckStateSource, context);
}

function loadCreateCurrentStudioSessionStateOptions(fileContent, context) {
  const helperSource = extractFunctionSource(
    fileContent,
    'function createCurrentStudioSessionStateOptions(options = {}) {',
    '\n\n    function createCurrentStudioFrameLoadStateOptions(options = {}) {'
  );
  vm.runInContext(helperSource, context);
}

function loadCreateCurrentStudioVersionPersistenceActionContext(fileContent, context) {
  const helperSource = extractFunctionSource(
    fileContent,
    'function createCurrentStudioVersionPersistenceActionContext(',
    '\n\n    function handleCurrentStudioVersionPersistenceSuccess(persistenceContext, options = {}) {'
  );
  vm.runInContext(helperSource, context);
}

function loadCaptureCurrentStudioSessionSnapshot(fileContent, context) {
  const helperSource = extractFunctionSource(
    fileContent,
    'function captureCurrentStudioSessionSnapshot() {',
    '\n    \n    async function submitSaveVersion() {'
  );
  vm.runInContext(helperSource, context);
}

function loadCaptureCurrentStudioPersistableDeckState(fileContent, context) {
  const helperSource = extractFunctionSource(
    fileContent,
    'function captureCurrentStudioPersistableDeckState(doc = getIframeDoc()) {',
    '\n    \n    async function submitSaveVersion() {'
  );
  vm.runInContext(helperSource, context);
}

function loadCreateCurrentStudioVersionPersistenceHandlerOptions(fileContent, context) {
  loadCreateCurrentStudioSessionStateOptions(fileContent, context);
  const helperSource = extractFunctionSource(
    fileContent,
    'function createCurrentStudioVersionPersistenceHandlerOptions(options = {}) {',
    '\n\n    function handleCurrentStudioVersionPersistenceSuccess(persistenceContext, options = {}) {'
  );
  vm.runInContext(helperSource, context);
}

function loadHandleCurrentStudioVersionPersistenceSuccess(fileContent, context) {
  loadCreateCurrentStudioVersionPersistenceActionContext(fileContent, context);
  loadCreateCurrentStudioVersionPersistenceHandlerOptions(fileContent, context);
  const helperSource = extractFunctionSource(
    fileContent,
    'function handleCurrentStudioVersionPersistenceSuccess(persistenceContext, options = {}) {',
    '\n    \n    async function submitSaveVersion() {'
  );
  vm.runInContext(helperSource, context);
}

function loadCreateCurrentStudioPersistenceHandlerOptions(fileContent, context) {
  loadCreateCurrentStudioSessionStateOptions(fileContent, context);
  const helperSource = extractFunctionSource(
    fileContent,
    'function createCurrentStudioPersistenceHandlerOptions(options = {}) {',
    '\n\n    function handleCurrentStudioPersistenceSuccess(persistenceContext, options = {}) {'
  );
  vm.runInContext(helperSource, context);
}

function loadIsCurrentStudioPersistenceActionCurrent(fileContent, context) {
  loadCreateCurrentStudioSessionStateOptions(fileContent, context);
  const helperSource = extractFunctionSource(
    fileContent,
    'function isCurrentStudioPersistenceActionCurrent(persistenceContext) {',
    '\n\n    function handleCurrentStudioVersionPersistenceSuccess(persistenceContext, options = {}) {'
  );
  vm.runInContext(helperSource, context);
}

function loadHandleCurrentStudioPersistenceSuccess(fileContent, context) {
  loadCreateCurrentStudioPersistenceHandlerOptions(fileContent, context);
  const helperSource = extractFunctionSource(
    fileContent,
    'function handleCurrentStudioPersistenceSuccess(persistenceContext, options = {}) {',
    '\n\n    function handleCurrentStudioPersistenceFailure(persistenceContext, options = {}) {'
  );
  vm.runInContext(helperSource, context);
}

function loadHandleCurrentStudioPersistenceFailure(fileContent, context) {
  loadCreateCurrentStudioPersistenceHandlerOptions(fileContent, context);
  const helperSource = extractFunctionSource(
    fileContent,
    'function handleCurrentStudioPersistenceFailure(persistenceContext, options = {}) {',
    '\n\n    async function saveVersionCheckpoint(versionLabel, cleanHtml, presentationUrl = currentPresentationUrl, options = {}) {'
  );
  vm.runInContext(helperSource, context);
}

test('setStudioSaveButtonState renders the version button loading and idle states', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const setStudioSaveButtonStateSource = extractFunctionSource(
    fileContent,
    'function setStudioSaveButtonState(state) {',
    '\n\n    function resetStudioSaveButtonState() {'
  );

  const saveBtnEl = {
    disabled: false,
    innerHTML: '<span>Save Version</span>'
  };
  const context = {
    document: {
      getElementById(id) {
        if (id === 'studioSaveBtn') return saveBtnEl;
        return null;
      }
    }
  };

  vm.createContext(context);
  vm.runInContext(setStudioSaveButtonStateSource, context);

  context.setStudioSaveButtonState('saving-version');
  assert.equal(saveBtnEl.disabled, true);
  assert.match(saveBtnEl.innerHTML, /Creating version/);

  context.setStudioSaveButtonState('idle');
  assert.equal(saveBtnEl.disabled, false);
  assert.match(saveBtnEl.innerHTML, /Save Version/);
});

test('captureCurrentStudioPersistableDeckState reuses the shared iframe accessor and persistable deck capture', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const iframeDoc = { label: 'iframe-doc' };
  const persistedDeckState = {
    cleanHtml: '<html>persisted</html>',
    canonicalDeck: { kind: 'slidenext.deck', schemaVersion: 1, slides: [] },
    playbackState: { activeSlideIds: ['slide-1'], slideCounterText: '1 / 1' }
  };
  const context = {
    captureEditorPersistableDeckState(doc) {
      assert.equal(doc, iframeDoc);
      return persistedDeckState;
    },
    getIframeDoc() {
      return iframeDoc;
    }
  };

  vm.createContext(context);
  loadCaptureCurrentStudioPersistableDeckState(fileContent, context);

  assert.deepEqual(
    JSON.parse(JSON.stringify(context.captureCurrentStudioPersistableDeckState())),
    {
      doc: iframeDoc,
      cleanHtml: '<html>persisted</html>',
      canonicalDeck: { kind: 'slidenext.deck', schemaVersion: 1, slides: [] },
      playbackState: { activeSlideIds: ['slide-1'], slideCounterText: '1 / 1' }
    }
  );
});

test('captureCurrentStudioPersistableDeckStateWithContent returns null when the current deck has no persistable html', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const context = {
    captureEditorPersistableDeckState() {
      return {
        cleanHtml: '',
        canonicalDeck: { kind: 'slidenext.deck', schemaVersion: 1, slides: [] },
        playbackState: null
      };
    },
    getIframeDoc() {
      return null;
    }
  };

  vm.createContext(context);
  loadCaptureCurrentStudioPersistableDeckState(fileContent, context);

  assert.equal(context.captureCurrentStudioPersistableDeckStateWithContent(), null);
});

test('createStudioVersionCheckpointRequestOptions reuses the captured persistable deck state and session token', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const persistedDeckState = {
    doc: { label: 'iframe-doc' },
    cleanHtml: '<html>persisted</html>',
    canonicalDeck: { kind: 'slidenext.deck', schemaVersion: 1, slides: [] },
    playbackState: { activeSlideIds: ['slide-1'], slideCounterText: '1 / 1' }
  };
  const context = {
    studioEditorSessionToken: 17
  };

  vm.createContext(context);
  loadCaptureCurrentStudioPersistableDeckState(fileContent, context);

  assert.deepEqual(
    JSON.parse(JSON.stringify(context.createStudioVersionCheckpointRequestOptions(persistedDeckState))),
    {
      sessionToken: 17,
      doc: { label: 'iframe-doc' },
      canonicalDeck: { kind: 'slidenext.deck', schemaVersion: 1, slides: [] },
      playbackState: { activeSlideIds: ['slide-1'], slideCounterText: '1 / 1' }
    }
  );
});

test('createStudioVersionCheckpointPersistenceState reuses checkpoint options and persistence context for the current deck state', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const persistedDeckState = {
    doc: { label: 'iframe-doc' },
    cleanHtml: '<html>persisted</html>',
    canonicalDeck: { kind: 'slidenext.deck', schemaVersion: 1, slides: [] },
    playbackState: { activeSlideIds: ['slide-1'], slideCounterText: '1 / 1' }
  };
  const context = {
    createCurrentStudioVersionPersistenceActionContext(cleanHtml, presentationUrl, sessionToken) {
      return {
        cleanHtml,
        presentationUrl,
        sessionToken,
        type: 'persistence-context'
      };
    },
    studioEditorSessionToken: 17
  };

  vm.createContext(context);
  loadCaptureCurrentStudioPersistableDeckState(fileContent, context);

  assert.deepEqual(
    JSON.parse(JSON.stringify(
      context.createStudioVersionCheckpointPersistenceState(
        persistedDeckState,
        '/presentations/onboarding-presentation/index.html',
        17
      )
    )),
    {
      cleanHtml: '<html>persisted</html>',
      persistenceContext: {
        cleanHtml: '<html>persisted</html>',
        presentationUrl: '/presentations/onboarding-presentation/index.html',
        sessionToken: 17,
        type: 'persistence-context'
      },
      requestOptions: {
        sessionToken: 17,
        doc: { label: 'iframe-doc' },
        canonicalDeck: { kind: 'slidenext.deck', schemaVersion: 1, slides: [] },
        playbackState: { activeSlideIds: ['slide-1'], slideCounterText: '1 / 1' }
      }
    }
  );
});

test('isCurrentStudioPersistenceActionCurrent reuses current session readers for save-version persistence checks', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
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
    SlideNextStudioEditorPersistence: {
      isStudioPersistenceActionCurrent(persistenceContext, options) {
        capturedOptions = options;
        return persistenceContext.sessionToken === 8;
      }
    },
    createCurrentStudioSessionStateReaders() {
      return currentStudioSessionStateReaders;
    },
    currentPresentationUrl: '/presentations/onboarding-presentation/index.html',
    studioEditorSessionToken: 8
  };

  vm.createContext(context);
  loadIsCurrentStudioPersistenceActionCurrent(fileContent, context);

  const result = context.isCurrentStudioPersistenceActionCurrent({
    presentationUrl: '/presentations/onboarding-presentation/index.html',
    sessionToken: 8
  });

  assert.equal(result, true);
  assert.equal(capturedOptions.getCurrentPresentationUrl, currentStudioSessionStateReaders.getCurrentPresentationUrl);
  assert.equal(capturedOptions.getCurrentSessionToken, currentStudioSessionStateReaders.getCurrentSessionToken);
});

test('createCurrentStudioVersionPersistenceActionContext reuses the current save-version session identity', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const calls = [];
  const context = {
    SlideNextStudioEditorPersistence: {
      createStudioVersionPersistenceActionContext(presentationUrl, cleanHtml, options) {
        calls.push([presentationUrl, cleanHtml, options]);
        return {
          presentationUrl,
          cleanHtml,
          sessionToken: options.sessionToken
        };
      }
    },
    currentPresentationUrl: '/presentations/onboarding-presentation/index.html',
    studioEditorSessionToken: 12
  };

  vm.createContext(context);
  loadCreateCurrentStudioVersionPersistenceActionContext(fileContent, context);

  const persistenceContext = context.createCurrentStudioVersionPersistenceActionContext('<html></html>');

  assert.deepEqual(persistenceContext, {
    presentationUrl: '/presentations/onboarding-presentation/index.html',
    cleanHtml: '<html></html>',
    sessionToken: 12
  });
  assert.deepEqual(JSON.parse(JSON.stringify(calls)), [[
    '/presentations/onboarding-presentation/index.html',
    '<html></html>',
    { sessionToken: 12 }
  ]]);
});

test('captureCurrentStudioSessionSnapshot captures the current presentation identity and session token', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const context = {
    currentPresentationUrl: '/presentations/onboarding-presentation/index.html',
    studioEditorSessionToken: 13
  };

  vm.createContext(context);
  loadCaptureCurrentStudioSessionSnapshot(fileContent, context);

  const snapshot = context.captureCurrentStudioSessionSnapshot();

  assert.deepEqual(JSON.parse(JSON.stringify(snapshot)), {
    presentationUrl: '/presentations/onboarding-presentation/index.html',
    sessionToken: 13
  });
});

test('createCurrentStudioVersionPersistenceHandlerOptions reuses current session readers and forwards success hooks', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const currentStudioSessionStateReaders = {
    getCurrentPresentationUrl() {
      return context.currentPresentationUrl;
    },
    getCurrentSessionToken() {
      return context.studioEditorSessionToken;
    }
  };
  const hooks = {
    onSuccess() {},
    refreshVersionEntries() {}
  };
  const context = {
    createCurrentStudioSessionStateReaders() {
      return currentStudioSessionStateReaders;
    },
    currentPresentationUrl: '/presentations/onboarding-presentation/index.html',
    studioEditorSessionToken: 9
  };

  vm.createContext(context);
  loadCreateCurrentStudioVersionPersistenceHandlerOptions(fileContent, context);

  const options = context.createCurrentStudioVersionPersistenceHandlerOptions(hooks);

  assert.equal(options.getCurrentPresentationUrl, currentStudioSessionStateReaders.getCurrentPresentationUrl);
  assert.equal(options.getCurrentSessionToken, currentStudioSessionStateReaders.getCurrentSessionToken);
  assert.equal(options.onSuccess, hooks.onSuccess);
  assert.equal(options.refreshVersionEntries, hooks.refreshVersionEntries);
});

test('handleCurrentStudioVersionPersistenceSuccess reuses current session readers and refreshes version entries', () => {
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
    currentPresentationUrl: '/presentations/onboarding-presentation/index.html',
    loadVersions(presentationUrl, sessionToken) {
      calls.push(['loadVersions', presentationUrl, sessionToken]);
    },
    studioEditorSessionToken: 10
  };

  vm.createContext(context);
  loadHandleCurrentStudioVersionPersistenceSuccess(fileContent, context);

  const applied = context.handleCurrentStudioVersionPersistenceSuccess({
    presentationUrl: '/presentations/onboarding-presentation/index.html',
    cleanHtml: '<html></html>',
    sessionToken: 10
  }, {
    onSuccess(nextContext) {
      calls.push(['onSuccess', nextContext.presentationUrl]);
    }
  });

  assert.equal(applied, true);
  assert.deepEqual(calls, [
    ['onSuccess', '/presentations/onboarding-presentation/index.html'],
    ['loadVersions', '/presentations/onboarding-presentation/index.html', 10]
  ]);
});

test('submitSaveVersion keeps the save button idle when editor content is unavailable', async () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const submitSaveVersionSource = extractFunctionSource(
    fileContent,
    'async function submitSaveVersion() {',
    '\n\n    // Automatically save a labeled checkpoint version in the background'
  );

  const alerts = [];
  let closeModalCalls = 0;
  let saveVersionCalls = 0;

  const inputEl = { value: 'Checkpoint A' };
  const saveBtnEl = {
    disabled: false,
    innerHTML: '<span>Save Version</span>'
  };
  const statusEl = {
    innerHTML: 'Saved to disk'
  };

  const documentStub = {
    getElementById(id) {
      switch (id) {
        case 'versionCheckpointName':
          return inputEl;
        case 'studioSaveBtn':
          return saveBtnEl;
        case 'autoSaveStatus':
          return statusEl;
        default:
          throw new Error(`Unexpected element lookup: ${id}`);
      }
    }
  };

  const context = {
    alert(message) {
      alerts.push(message);
    },
    buildPersistableDeckHtml(nextDoc) {
      assert.equal(nextDoc, null);
      return '';
    },
    capturePersistedDeckPlaybackState() {
      return null;
    },
    closeSaveVersionModal() {
      closeModalCalls += 1;
    },
    createCurrentStudioSessionStateReaders() {
      return {
        getCurrentPresentationUrl: () => context.currentPresentationUrl,
        getCurrentSessionToken: () => context.studioEditorSessionToken
      };
    },
    currentPresentationUrl: '/presentations/onboarding-presentation/index.html',
    document: documentStub,
    getIframeDoc() {
      return null;
    },
    resetStudioSaveButtonState() {
      saveBtnEl.disabled = false;
      saveBtnEl.innerHTML = '<span>Save Version</span>';
    },
    setStudioSaveButtonState(state) {
      if (state === 'saving-version') {
        saveBtnEl.disabled = true;
        saveBtnEl.innerHTML = '<span>Creating version...</span>';
      }
    },
    setStudioAutoSaveStatus(state) {
      statusEl.innerHTML = state;
    },
    saveVersionCheckpoint: async () => {
      saveVersionCalls += 1;
      return { success: true };
    },
    SlideNextStudioEditorPersistence: {
      createStudioPersistenceActionContext() {
        return {};
      },
      handleStudioPersistenceFailure() {
        return false;
      },
      handleStudioPersistenceSuccess() {
        return false;
      }
    }
  };

  vm.createContext(context);
  loadCaptureEditorPersistableDeckState(fileContent, context);
  loadCaptureCurrentStudioSessionSnapshot(fileContent, context);
  loadIsCurrentStudioPersistenceActionCurrent(fileContent, context);
  loadHandleCurrentStudioPersistenceFailure(fileContent, context);
  loadHandleCurrentStudioVersionPersistenceSuccess(fileContent, context);
  vm.runInContext(submitSaveVersionSource, context);

  await context.submitSaveVersion();

  assert.deepEqual(alerts, ['Save version failed: editor content is unavailable.']);
  assert.equal(closeModalCalls, 0);
  assert.equal(saveVersionCalls, 0);
  assert.equal(saveBtnEl.disabled, false);
  assert.equal(saveBtnEl.innerHTML, '<span>Save Version</span>');
  assert.equal(statusEl.innerHTML, 'Saved to disk');
});

test('submitSaveVersion can save the persisted html baseline when the editor frame is unavailable', async () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const submitSaveVersionSource = extractFunctionSource(
    fileContent,
    'async function submitSaveVersion() {',
    '\n\n    // Automatically save a labeled checkpoint version in the background'
  );

  const alerts = [];
  let closeModalCalls = 0;
  const loadVersionsCalls = [];
  const saveVersionCalls = [];

  const inputEl = { value: 'Checkpoint Baseline' };
  const saveBtnEl = {
    disabled: false,
    innerHTML: '<span>Save Version</span>'
  };
  const statusEl = {
    innerHTML: 'Saved to disk'
  };
  const canonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: []
  };

  const documentStub = {
    getElementById(id) {
      switch (id) {
        case 'versionCheckpointName':
          return inputEl;
        case 'studioSaveBtn':
          return saveBtnEl;
        case 'autoSaveStatus':
          return statusEl;
        default:
          throw new Error(`Unexpected element lookup: ${id}`);
      }
    }
  };

  const context = {
    alert(message) {
      alerts.push(message);
    },
    buildPersistableDeckHtml(nextDoc, buildOptions = {}) {
      assert.equal(nextDoc, null);
      assert.equal(typeof buildOptions.onCanonicalDeckResolved, 'function');
      buildOptions.onCanonicalDeckResolved(canonicalDeck);
      return '<html>persisted-baseline</html>';
    },
    capturePersistedDeckPlaybackState() {
      return null;
    },
    closeSaveVersionModal() {
      closeModalCalls += 1;
    },
    createCurrentStudioSessionStateReaders() {
      return {
        getCurrentPresentationUrl: () => context.currentPresentationUrl,
        getCurrentSessionToken: () => context.studioEditorSessionToken
      };
    },
    currentPresentationUrl: '/presentations/onboarding-presentation/index.html',
    document: documentStub,
    getIframeDoc() {
      return null;
    },
    loadVersions(presentationUrl, sessionToken) {
      loadVersionsCalls.push([presentationUrl, sessionToken]);
    },
    resetStudioSaveButtonState() {
      saveBtnEl.disabled = false;
      saveBtnEl.innerHTML = '<span>Save Version</span>';
    },
    saveVersionCheckpoint: async (...args) => {
      saveVersionCalls.push(args);
      return { success: true };
    },
    setStudioSaveButtonState(state) {
      if (state === 'saving-version') {
        saveBtnEl.disabled = true;
        saveBtnEl.innerHTML = '<span>Creating version...</span>';
      }
    },
    setStudioAutoSaveStatus(state) {
      statusEl.innerHTML = state;
    },
    SlideNextStudioEditorPersistence: editorPersistence,
    studioEditorSessionToken: 4
  };

  vm.createContext(context);
  loadCaptureEditorPersistableDeckState(fileContent, context);
  loadCaptureCurrentStudioSessionSnapshot(fileContent, context);
  loadIsCurrentStudioPersistenceActionCurrent(fileContent, context);
  loadHandleCurrentStudioPersistenceFailure(fileContent, context);
  loadHandleCurrentStudioVersionPersistenceSuccess(fileContent, context);
  vm.runInContext(submitSaveVersionSource, context);

  await context.submitSaveVersion();

  assert.deepEqual(alerts, ['Successfully saved named version backup checkpoint!']);
  assert.equal(closeModalCalls, 1);
  assert.equal(saveVersionCalls.length, 1);
  assert.equal(saveVersionCalls[0][0], 'Checkpoint Baseline');
  assert.equal(saveVersionCalls[0][1], '<html>persisted-baseline</html>');
  assert.equal(saveVersionCalls[0][2], '/presentations/onboarding-presentation/index.html');
  assert.equal(saveVersionCalls[0][3].sessionToken, 4);
  assert.equal(saveVersionCalls[0][3].doc, null);
  assert.equal(saveVersionCalls[0][3].canonicalDeck, canonicalDeck);
  assert.deepEqual(loadVersionsCalls, [[
    '/presentations/onboarding-presentation/index.html',
    4
  ]]);
  assert.equal(saveBtnEl.disabled, false);
  assert.equal(saveBtnEl.innerHTML, '<span>Save Version</span>');
  assert.equal(statusEl.innerHTML, 'saved');
});

test('submitSaveVersion can save rendered canonical html when the editor frame has no persisted html baseline', async () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const submitSaveVersionSource = extractFunctionSource(
    fileContent,
    'async function submitSaveVersion() {',
    '\n\n    // Automatically save a labeled checkpoint version in the background'
  );

  const alerts = [];
  let closeModalCalls = 0;
  const loadVersionsCalls = [];
  const saveVersionCalls = [];

  const inputEl = { value: 'Checkpoint Canonical' };
  const saveBtnEl = {
    disabled: false,
    innerHTML: '<span>Save Version</span>'
  };
  const statusEl = {
    innerHTML: 'Saved to disk'
  };
  const canonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: [{ id: 'slide-1', nodes: [] }]
  };

  const documentStub = {
    getElementById(id) {
      switch (id) {
        case 'versionCheckpointName':
          return inputEl;
        case 'studioSaveBtn':
          return saveBtnEl;
        case 'autoSaveStatus':
          return statusEl;
        default:
          throw new Error(`Unexpected element lookup: ${id}`);
      }
    }
  };

  const context = {
    alert(message) {
      alerts.push(message);
    },
    buildPersistableDeckHtml(nextDoc, buildOptions = {}) {
      assert.equal(nextDoc, null);
      assert.equal(typeof buildOptions.onCanonicalDeckResolved, 'function');
      buildOptions.onCanonicalDeckResolved(canonicalDeck);
      return '<html>canonical-source</html>';
    },
    capturePersistedDeckPlaybackState() {
      return null;
    },
    closeSaveVersionModal() {
      closeModalCalls += 1;
    },
    createCurrentStudioSessionStateReaders() {
      return {
        getCurrentPresentationUrl: () => context.currentPresentationUrl,
        getCurrentSessionToken: () => context.studioEditorSessionToken
      };
    },
    currentPresentationUrl: '/presentations/onboarding-presentation/index.html',
    document: documentStub,
    getIframeDoc() {
      return null;
    },
    loadVersions(presentationUrl, sessionToken) {
      loadVersionsCalls.push([presentationUrl, sessionToken]);
    },
    resetStudioSaveButtonState() {
      saveBtnEl.disabled = false;
      saveBtnEl.innerHTML = '<span>Save Version</span>';
    },
    saveVersionCheckpoint: async (...args) => {
      saveVersionCalls.push(args);
      return { success: true };
    },
    setStudioSaveButtonState(state) {
      if (state === 'saving-version') {
        saveBtnEl.disabled = true;
        saveBtnEl.innerHTML = '<span>Creating version...</span>';
      }
    },
    setStudioAutoSaveStatus(state) {
      statusEl.innerHTML = state;
    },
    SlideNextStudioEditorPersistence: editorPersistence,
    studioEditorSessionToken: 5
  };

  vm.createContext(context);
  loadCaptureEditorPersistableDeckState(fileContent, context);
  loadCaptureCurrentStudioSessionSnapshot(fileContent, context);
  loadIsCurrentStudioPersistenceActionCurrent(fileContent, context);
  loadHandleCurrentStudioPersistenceFailure(fileContent, context);
  loadHandleCurrentStudioVersionPersistenceSuccess(fileContent, context);
  vm.runInContext(submitSaveVersionSource, context);

  await context.submitSaveVersion();

  assert.deepEqual(alerts, ['Successfully saved named version backup checkpoint!']);
  assert.equal(closeModalCalls, 1);
  assert.equal(saveVersionCalls.length, 1);
  assert.equal(saveVersionCalls[0][0], 'Checkpoint Canonical');
  assert.equal(saveVersionCalls[0][1], '<html>canonical-source</html>');
  assert.equal(saveVersionCalls[0][2], '/presentations/onboarding-presentation/index.html');
  assert.equal(saveVersionCalls[0][3].sessionToken, 5);
  assert.equal(saveVersionCalls[0][3].doc, null);
  assert.equal(saveVersionCalls[0][3].canonicalDeck, canonicalDeck);
  assert.deepEqual(loadVersionsCalls, [[
    '/presentations/onboarding-presentation/index.html',
    5
  ]]);
  assert.equal(saveBtnEl.disabled, false);
  assert.equal(saveBtnEl.innerHTML, '<span>Save Version</span>');
  assert.equal(statusEl.innerHTML, 'saved');
});

test('submitSaveVersion ignores stale same-url session completions', async () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const submitSaveVersionSource = extractFunctionSource(
    fileContent,
    'async function submitSaveVersion() {',
    '\n\n    // Automatically save a labeled checkpoint version in the background'
  );

  const alerts = [];
  let closeModalCalls = 0;
  let loadVersionsCalls = 0;
  let resolveCheckpoint;

  const inputEl = { value: 'Checkpoint B' };
  const saveBtnEl = {
    disabled: false,
    innerHTML: '<span>Save Version</span>'
  };
  const statusEl = {
    innerHTML: 'Saved to disk'
  };
  const iframeDoc = { documentElement: {} };
  const canonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: []
  };

  const documentStub = {
    getElementById(id) {
      switch (id) {
        case 'versionCheckpointName':
          return inputEl;
        case 'studioSaveBtn':
          return saveBtnEl;
        case 'autoSaveStatus':
          return statusEl;
        default:
          throw new Error(`Unexpected element lookup: ${id}`);
      }
    }
  };

  const context = {
    alert(message) {
      alerts.push(message);
    },
    buildPersistableDeckHtml(nextDoc, buildOptions = {}) {
      assert.equal(nextDoc, iframeDoc);
      assert.equal(typeof buildOptions.onCanonicalDeckResolved, 'function');
      buildOptions.onCanonicalDeckResolved(canonicalDeck);
      return '<html>persisted</html>';
    },
    capturePersistedDeckPlaybackState() {
      return null;
    },
    closeSaveVersionModal() {
      closeModalCalls += 1;
    },
    createCurrentStudioSessionStateReaders() {
      return {
        getCurrentPresentationUrl: () => context.currentPresentationUrl,
        getCurrentSessionToken: () => context.studioEditorSessionToken
      };
    },
    currentPresentationUrl: '/presentations/onboarding-presentation/index.html',
    document: documentStub,
    getIframeDoc() {
      return iframeDoc;
    },
    loadVersions() {
      loadVersionsCalls += 1;
    },
    resetStudioSaveButtonState() {
      saveBtnEl.disabled = false;
      saveBtnEl.innerHTML = '<span>Save Version</span>';
    },
    setStudioSaveButtonState(state) {
      if (state === 'saving-version') {
        saveBtnEl.disabled = true;
        saveBtnEl.innerHTML = '<span>Creating version...</span>';
      }
    },
    setStudioAutoSaveStatus(state) {
      statusEl.innerHTML = state;
    },
    saveVersionCheckpoint: () => new Promise((resolve) => {
      resolveCheckpoint = resolve;
    }),
    SlideNextStudioEditorPersistence: editorPersistence,
    studioEditorSessionToken: 4
  };

  vm.createContext(context);
  loadCaptureEditorPersistableDeckState(fileContent, context);
  loadCaptureCurrentStudioSessionSnapshot(fileContent, context);
  loadIsCurrentStudioPersistenceActionCurrent(fileContent, context);
  loadHandleCurrentStudioPersistenceFailure(fileContent, context);
  loadHandleCurrentStudioVersionPersistenceSuccess(fileContent, context);
  vm.runInContext(submitSaveVersionSource, context);

  const savePromise = context.submitSaveVersion();
  assert.equal(closeModalCalls, 1);
  assert.equal(saveBtnEl.disabled, true);
  assert.match(saveBtnEl.innerHTML, /Creating version/);

  context.studioEditorSessionToken = 5;
  context.resetStudioSaveButtonState();
  resolveCheckpoint({ success: true });
  await savePromise;

  assert.deepEqual(alerts, []);
  assert.equal(loadVersionsCalls, 0);
  assert.equal(saveBtnEl.disabled, false);
  assert.equal(saveBtnEl.innerHTML, '<span>Save Version</span>');
  assert.equal(statusEl.innerHTML, 'Saved to disk');
});

test('executeSaveAutoVersion skips persistence when editor content is unavailable', async () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const executeSaveAutoVersionSource = extractFunctionSource(
    fileContent,
    'async function executeSaveAutoVersion(label, presentationUrl = currentPresentationUrl, sessionToken = studioEditorSessionToken) {',
    '\n\n    // 7. Versions and Backups listing'
  );

  let saveVersionCalls = 0;
  const context = {
    buildPersistableDeckHtml(nextDoc) {
      assert.equal(nextDoc, null);
      return '';
    },
    capturePersistedDeckPlaybackState() {
      return null;
    },
    createCurrentStudioSessionStateReaders() {
      return {
        getCurrentPresentationUrl: () => context.currentPresentationUrl,
        getCurrentSessionToken: () => context.studioEditorSessionToken
      };
    },
    currentPresentationUrl: '/presentations/onboarding-presentation/index.html',
    getIframeDoc() {
      return null;
    },
    isStaleEditorPersistenceTask() {
      return false;
    },
    loadVersions() {},
    saveVersionCheckpoint: async () => {
      saveVersionCalls += 1;
      return { success: true };
    },
    SlideNextStudioEditorPersistence: editorPersistence,
    studioEditorSessionToken: 4
  };

  vm.createContext(context);
  loadCaptureEditorPersistableDeckState(fileContent, context);
  loadCaptureCurrentStudioPersistableDeckState(fileContent, context);
  loadHandleCurrentStudioVersionPersistenceSuccess(fileContent, context);
  vm.runInContext(executeSaveAutoVersionSource, context);

  await context.executeSaveAutoVersion('Auto: Edited Text');

  assert.equal(saveVersionCalls, 0);
});

test('executeSaveAutoVersion can save the persisted html baseline when the editor frame is unavailable', async () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const executeSaveAutoVersionSource = extractFunctionSource(
    fileContent,
    'async function executeSaveAutoVersion(label, presentationUrl = currentPresentationUrl, sessionToken = studioEditorSessionToken) {',
    '\n\n    // 7. Versions and Backups listing'
  );

  const loadVersionsCalls = [];
  const logCalls = [];
  const saveVersionCalls = [];
  const canonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: []
  };
  const context = {
    buildPersistableDeckHtml(nextDoc, buildOptions = {}) {
      assert.equal(nextDoc, null);
      assert.equal(typeof buildOptions.onCanonicalDeckResolved, 'function');
      buildOptions.onCanonicalDeckResolved(canonicalDeck);
      return '<html>persisted-baseline</html>';
    },
    capturePersistedDeckPlaybackState() {
      return null;
    },
    console: {
      error() {
        throw new Error('executeSaveAutoVersion should not report errors for persisted baseline saves');
      },
      log(message) {
        logCalls.push(message);
      }
    },
    createCurrentStudioSessionStateReaders() {
      return {
        getCurrentPresentationUrl: () => context.currentPresentationUrl,
        getCurrentSessionToken: () => context.studioEditorSessionToken
      };
    },
    currentPresentationUrl: '/presentations/onboarding-presentation/index.html',
    getIframeDoc() {
      return null;
    },
    isStaleEditorPersistenceTask() {
      return false;
    },
    loadVersions(presentationUrl, sessionToken) {
      loadVersionsCalls.push([presentationUrl, sessionToken]);
    },
    saveVersionCheckpoint: async (...args) => {
      saveVersionCalls.push(args);
      return { success: true };
    },
    SlideNextStudioEditorPersistence: editorPersistence,
    studioEditorSessionToken: 4
  };

  vm.createContext(context);
  loadCaptureEditorPersistableDeckState(fileContent, context);
  loadCaptureCurrentStudioPersistableDeckState(fileContent, context);
  loadHandleCurrentStudioVersionPersistenceSuccess(fileContent, context);
  vm.runInContext(executeSaveAutoVersionSource, context);

  await context.executeSaveAutoVersion('Auto: Edited Text');

  assert.equal(saveVersionCalls.length, 1);
  assert.equal(saveVersionCalls[0][0], 'Auto: Edited Text');
  assert.equal(saveVersionCalls[0][1], '<html>persisted-baseline</html>');
  assert.equal(saveVersionCalls[0][2], '/presentations/onboarding-presentation/index.html');
  assert.equal(saveVersionCalls[0][3].sessionToken, 4);
  assert.equal(saveVersionCalls[0][3].doc, null);
  assert.equal(saveVersionCalls[0][3].canonicalDeck, canonicalDeck);
  assert.deepEqual(loadVersionsCalls, [[
    '/presentations/onboarding-presentation/index.html',
    4
  ]]);
  assert.deepEqual(logCalls, ['Auto-created version checkpoint: Auto: Edited Text']);
});

test('triggerAutoSave skips persistence when the shared iframe accessor has no live document and no fallback html', async () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const triggerAutoSaveSource = extractFunctionSource(
    fileContent,
    'function triggerAutoSave() {',
    '\n\n    // Custom styled checkpoint version modal controls'
  );

  let scheduledCallback = null;
  let buildPersistableDeckHtmlCalls = 0;
  let fetchCalls = 0;
  let saveRequestBodyCalls = 0;
  const statusEl = {
    innerHTML: 'Saved to disk'
  };

  const context = {
    SlideNextStudioEditorPersistence: editorPersistence,
    autoSaveDebounceTimer: null,
    buildEditorSaveRequestBody() {
      saveRequestBodyCalls += 1;
      return {};
    },
    buildPersistableDeckHtml() {
      buildPersistableDeckHtmlCalls += 1;
      return '';
    },
    capturePersistedDeckPlaybackState() {
      return null;
    },
    clearTimeout() {},
    createCurrentStudioSessionStateReaders() {
      return {
        getCurrentPresentationUrl: () => context.currentPresentationUrl,
        getCurrentSessionToken: () => context.studioEditorSessionToken
      };
    },
    currentPresentationUrl: '/presentations/onboarding-presentation/index.html',
    document: {
      getElementById(id) {
        if (id === 'autoSaveStatus') {
          return statusEl;
        }
        throw new Error(`Unexpected element lookup: ${id}`);
      }
    },
    fetch: async () => {
      fetchCalls += 1;
      return {
        async json() {
          return { success: true };
        }
      };
    },
    getIframeDoc() {
      return null;
    },
    isCurrentDeckStatePersisted() {
      return false;
    },
    isStaleEditorPersistenceTask() {
      return false;
    },
    setStudioAutoSaveStatus(state) {
      statusEl.innerHTML = state;
    },
    setCurrentPresentationCanonicalDeck() {},
    setTimeout(callback) {
      scheduledCallback = callback;
      return 1;
    },
    studioEditorSessionToken: 9
  };

  vm.createContext(context);
  loadCaptureEditorPersistableDeckState(fileContent, context);
  loadCaptureCurrentStudioSessionSnapshot(fileContent, context);
  loadHandleCurrentStudioPersistenceSuccess(fileContent, context);
  loadHandleCurrentStudioPersistenceFailure(fileContent, context);
  vm.runInContext(triggerAutoSaveSource, context);

  context.triggerAutoSave();
  assert.equal(statusEl.innerHTML, 'saving');
  assert.equal(typeof scheduledCallback, 'function');

  await scheduledCallback();

  assert.equal(buildPersistableDeckHtmlCalls, 1);
  assert.equal(saveRequestBodyCalls, 0);
  assert.equal(fetchCalls, 0);
  assert.equal(statusEl.innerHTML, 'saved');
});

test('triggerAutoSave can persist rendered canonical html when the shared iframe accessor has no live document', async () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const triggerAutoSaveSource = extractFunctionSource(
    fileContent,
    'function triggerAutoSave() {',
    '\n\n    // Custom styled checkpoint version modal controls'
  );

  let scheduledCallback = null;
  const fetchCalls = [];
  const persistedStateUpdates = [];
  const canonicalDeckUpdates = [];
  let buildEditorCanonicalDeckCalls = 0;
  const statusEl = {
    innerHTML: 'Saved to disk'
  };
  const canonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: []
  };

  const context = {
    SlideNextStudioEditorPersistence: editorPersistence,
    autoSaveDebounceTimer: null,
    buildEditorSaveRequestBody(nextDoc, cleanHtml, options = {}) {
      assert.equal(nextDoc, null);
      assert.equal(options.canonicalDeck, canonicalDeck);
      return {
        htmlPath: options.presentationUrl,
        htmlContent: cleanHtml,
        isAutoSave: !!options.isAutoSave,
        canonicalDeck
      };
    },
    buildPersistableDeckHtml(nextDoc, buildOptions = {}) {
      assert.equal(nextDoc, null);
      assert.equal(typeof buildOptions.onCanonicalDeckResolved, 'function');
      buildOptions.onCanonicalDeckResolved(canonicalDeck);
      return '<html>canonical-source</html>';
    },
    buildEditorCanonicalDeck() {
      buildEditorCanonicalDeckCalls += 1;
      return canonicalDeck;
    },
    capturePersistedDeckPlaybackState(nextDoc) {
      assert.equal(nextDoc, null);
      return null;
    },
    clearTimeout() {},
    createCurrentStudioSessionStateReaders() {
      return {
        getCurrentPresentationUrl: () => context.currentPresentationUrl,
        getCurrentSessionToken: () => context.studioEditorSessionToken
      };
    },
    currentPresentationUrl: '/presentations/onboarding-presentation/index.html',
    document: {
      getElementById(id) {
        if (id === 'autoSaveStatus') {
          return statusEl;
        }
        throw new Error(`Unexpected element lookup: ${id}`);
      }
    },
    fetch: async (url, init) => {
      fetchCalls.push([url, JSON.parse(init.body)]);
      return {
        async json() {
          return { success: true };
        }
      };
    },
    getIframeDoc() {
      return null;
    },
    isCurrentDeckStatePersisted() {
      return false;
    },
    isStaleEditorPersistenceTask() {
      return false;
    },
    setCurrentPresentationCanonicalDeck(nextCanonicalDeck, presentationUrl) {
      canonicalDeckUpdates.push([nextCanonicalDeck, presentationUrl]);
    },
    setStudioAutoSaveStatus(state) {
      statusEl.innerHTML = state;
    },
    setTimeout(callback) {
      scheduledCallback = callback;
      return 1;
    },
    studioEditorSessionToken: 9,
    updateEditorPersistedDeckState(nextState) {
      persistedStateUpdates.push(nextState);
    }
  };

  vm.createContext(context);
  loadCaptureEditorPersistableDeckState(fileContent, context);
  loadCaptureCurrentStudioSessionSnapshot(fileContent, context);
  loadHandleCurrentStudioPersistenceSuccess(fileContent, context);
  loadHandleCurrentStudioPersistenceFailure(fileContent, context);
  vm.runInContext(triggerAutoSaveSource, context);

  context.triggerAutoSave();
  assert.equal(statusEl.innerHTML, 'saving');
  assert.equal(typeof scheduledCallback, 'function');

  await scheduledCallback();

  assert.deepEqual(fetchCalls, [[
    '/api/save',
    {
      htmlPath: '/presentations/onboarding-presentation/index.html',
      htmlContent: '<html>canonical-source</html>',
      isAutoSave: true,
      canonicalDeck
    }
  ]]);
  assert.equal(persistedStateUpdates.length, 2);
  assert.equal(persistedStateUpdates[0].cleanHtml, '<html>canonical-source</html>');
  assert.deepEqual(
    JSON.parse(JSON.stringify(persistedStateUpdates[1].canonicalDeck)),
    canonicalDeckModel.createCanonicalDeck(canonicalDeck)
  );
  assert.equal(canonicalDeckUpdates.length, 1);
  assert.deepEqual(
    JSON.parse(JSON.stringify(canonicalDeckUpdates[0][0])),
    canonicalDeckModel.createCanonicalDeck(canonicalDeck)
  );
  assert.equal(canonicalDeckUpdates[0][1], '/presentations/onboarding-presentation/index.html');
  assert.equal(buildEditorCanonicalDeckCalls, 0);
  assert.equal(statusEl.innerHTML, 'saved');
});

test('triggerAutoSave refreshes the persisted playback baseline after a successful live-frame save rewrite', async () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const triggerAutoSaveSource = extractFunctionSource(
    fileContent,
    'function triggerAutoSave() {',
    '\n\n    // Custom styled checkpoint version modal controls'
  );

  let scheduledCallback = null;
  const fetchCalls = [];
  const persistedStateUpdates = [];
  const statusEl = {
    innerHTML: 'Saved to disk'
  };
  const iframeDoc = { label: 'iframe-doc' };
  const playbackState = {
    activeSlideIds: ['slide-live'],
    slideCounterText: '2 / 4'
  };
  const canonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: []
  };

  const context = {
    SlideNextStudioEditorPersistence: editorPersistence,
    autoSaveDebounceTimer: null,
    buildEditorSaveRequestBody(nextDoc, cleanHtml, options = {}) {
      assert.equal(nextDoc, iframeDoc);
      assert.equal(options.canonicalDeck, canonicalDeck);
      return {
        htmlPath: options.presentationUrl,
        htmlContent: cleanHtml,
        isAutoSave: !!options.isAutoSave,
        canonicalDeck
      };
    },
    buildPersistableDeckHtml(nextDoc, buildOptions = {}) {
      assert.equal(nextDoc, iframeDoc);
      assert.equal(typeof buildOptions.onCanonicalDeckResolved, 'function');
      buildOptions.onCanonicalDeckResolved(canonicalDeck);
      return '<html>live-save</html>';
    },
    capturePersistedDeckPlaybackState(nextDoc) {
      assert.equal(nextDoc, iframeDoc);
      return playbackState;
    },
    clearTimeout() {},
    createCurrentStudioSessionStateReaders() {
      return {
        getCurrentPresentationUrl: () => context.currentPresentationUrl,
        getCurrentSessionToken: () => context.studioEditorSessionToken
      };
    },
    currentPresentationUrl: '/presentations/onboarding-presentation/index.html',
    document: {
      getElementById(id) {
        if (id === 'autoSaveStatus') {
          return statusEl;
        }
        throw new Error(`Unexpected element lookup: ${id}`);
      }
    },
    fetch: async (url, init) => {
      fetchCalls.push([url, JSON.parse(init.body)]);
      return {
        async json() {
          return { success: true };
        }
      };
    },
    getIframeDoc() {
      return iframeDoc;
    },
    isCurrentDeckStatePersisted() {
      return false;
    },
    isStaleEditorPersistenceTask() {
      return false;
    },
    setCurrentPresentationCanonicalDeck() {},
    setStudioAutoSaveStatus(state) {
      statusEl.innerHTML = state;
    },
    setTimeout(callback) {
      scheduledCallback = callback;
      return 1;
    },
    studioEditorSessionToken: 11,
    updateEditorPersistedDeckState(nextState) {
      persistedStateUpdates.push(nextState);
    }
  };

  vm.createContext(context);
  loadCaptureEditorPersistableDeckState(fileContent, context);
  loadCaptureCurrentStudioSessionSnapshot(fileContent, context);
  loadHandleCurrentStudioPersistenceSuccess(fileContent, context);
  loadHandleCurrentStudioPersistenceFailure(fileContent, context);
  vm.runInContext(triggerAutoSaveSource, context);

  context.triggerAutoSave();
  assert.equal(statusEl.innerHTML, 'saving');
  assert.equal(typeof scheduledCallback, 'function');

  await scheduledCallback();

  assert.deepEqual(fetchCalls, [[
    '/api/save',
    {
      htmlPath: '/presentations/onboarding-presentation/index.html',
      htmlContent: '<html>live-save</html>',
      isAutoSave: true,
      canonicalDeck
    }
  ]]);
  assert.equal(persistedStateUpdates.length, 3);
  assert.equal(persistedStateUpdates[0].cleanHtml, '<html>live-save</html>');
  assert.deepEqual(
    JSON.parse(JSON.stringify(persistedStateUpdates[1].canonicalDeck)),
    canonicalDeckModel.createCanonicalDeck(canonicalDeck)
  );
  assert.deepEqual(persistedStateUpdates[2].playbackState, playbackState);
  assert.equal(statusEl.innerHTML, 'saved');
});

test('triggerAutoSave clears the persisted playback baseline after a successful live-frame save rewrite without playback markers', async () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const triggerAutoSaveSource = extractFunctionSource(
    fileContent,
    'function triggerAutoSave() {',
    '\n\n    // Custom styled checkpoint version modal controls'
  );

  let scheduledCallback = null;
  const fetchCalls = [];
  const persistedStateUpdates = [];
  const statusEl = {
    innerHTML: 'Saved to disk'
  };
  const iframeDoc = { label: 'iframe-doc' };
  const canonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: []
  };

  const context = {
    SlideNextStudioEditorPersistence: editorPersistence,
    autoSaveDebounceTimer: null,
    buildEditorSaveRequestBody(nextDoc, cleanHtml, options = {}) {
      assert.equal(nextDoc, iframeDoc);
      assert.equal(options.canonicalDeck, canonicalDeck);
      return {
        htmlPath: options.presentationUrl,
        htmlContent: cleanHtml,
        isAutoSave: !!options.isAutoSave,
        canonicalDeck
      };
    },
    buildPersistableDeckHtml(nextDoc, buildOptions = {}) {
      assert.equal(nextDoc, iframeDoc);
      assert.equal(typeof buildOptions.onCanonicalDeckResolved, 'function');
      buildOptions.onCanonicalDeckResolved(canonicalDeck);
      return '<html>null-playback-save</html>';
    },
    capturePersistedDeckPlaybackState(nextDoc) {
      assert.equal(nextDoc, iframeDoc);
      return null;
    },
    clearTimeout() {},
    createCurrentStudioSessionStateReaders() {
      return {
        getCurrentPresentationUrl: () => context.currentPresentationUrl,
        getCurrentSessionToken: () => context.studioEditorSessionToken
      };
    },
    currentPresentationUrl: '/presentations/onboarding-presentation/index.html',
    document: {
      getElementById(id) {
        if (id === 'autoSaveStatus') {
          return statusEl;
        }
        throw new Error(`Unexpected element lookup: ${id}`);
      }
    },
    fetch: async (url, init) => {
      fetchCalls.push([url, JSON.parse(init.body)]);
      return {
        async json() {
          return { success: true };
        }
      };
    },
    getIframeDoc() {
      return iframeDoc;
    },
    isCurrentDeckStatePersisted() {
      return false;
    },
    isStaleEditorPersistenceTask() {
      return false;
    },
    setCurrentPresentationCanonicalDeck() {},
    setStudioAutoSaveStatus(state) {
      statusEl.innerHTML = state;
    },
    setTimeout(callback) {
      scheduledCallback = callback;
      return 1;
    },
    studioEditorSessionToken: 13,
    updateEditorPersistedDeckState(nextState) {
      persistedStateUpdates.push(nextState);
    }
  };

  vm.createContext(context);
  loadCaptureEditorPersistableDeckState(fileContent, context);
  loadCaptureCurrentStudioSessionSnapshot(fileContent, context);
  loadHandleCurrentStudioPersistenceSuccess(fileContent, context);
  loadHandleCurrentStudioPersistenceFailure(fileContent, context);
  vm.runInContext(triggerAutoSaveSource, context);

  context.triggerAutoSave();
  assert.equal(statusEl.innerHTML, 'saving');
  assert.equal(typeof scheduledCallback, 'function');

  await scheduledCallback();

  assert.deepEqual(fetchCalls, [[
    '/api/save',
    {
      htmlPath: '/presentations/onboarding-presentation/index.html',
      htmlContent: '<html>null-playback-save</html>',
      isAutoSave: true,
      canonicalDeck
    }
  ]]);
  assert.equal(persistedStateUpdates.length, 3);
  assert.equal(persistedStateUpdates[0].cleanHtml, '<html>null-playback-save</html>');
  assert.deepEqual(
    JSON.parse(JSON.stringify(persistedStateUpdates[1].canonicalDeck)),
    canonicalDeckModel.createCanonicalDeck(canonicalDeck)
  );
  assert.ok(Object.prototype.hasOwnProperty.call(persistedStateUpdates[2], 'playbackState'));
  assert.equal(persistedStateUpdates[2].playbackState, null);
  assert.equal(statusEl.innerHTML, 'saved');
});
