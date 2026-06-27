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
      return '<html>persisted-baseline</html>';
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
      return '<html>canonical-source</html>';
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
    buildPersistableDeckHtml() {
      return '<html>persisted</html>';
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
  const context = {
    buildPersistableDeckHtml(nextDoc) {
      assert.equal(nextDoc, null);
      return '<html>persisted-baseline</html>';
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
  vm.runInContext(executeSaveAutoVersionSource, context);

  await context.executeSaveAutoVersion('Auto: Edited Text');

  assert.equal(saveVersionCalls.length, 1);
  assert.equal(saveVersionCalls[0][0], 'Auto: Edited Text');
  assert.equal(saveVersionCalls[0][1], '<html>persisted-baseline</html>');
  assert.equal(saveVersionCalls[0][2], '/presentations/onboarding-presentation/index.html');
  assert.equal(saveVersionCalls[0][3].sessionToken, 4);
  assert.equal(saveVersionCalls[0][3].doc, null);
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
  vm.runInContext(triggerAutoSaveSource, context);

  context.triggerAutoSave();
  assert.equal(statusEl.innerHTML, 'saving');
  assert.equal(typeof scheduledCallback, 'function');

  await scheduledCallback();

  assert.equal(buildPersistableDeckHtmlCalls, 1);
  assert.equal(saveRequestBodyCalls, 0);
  assert.equal(fetchCalls, 0);
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
      return {
        htmlPath: options.presentationUrl,
        htmlContent: cleanHtml,
        isAutoSave: !!options.isAutoSave,
        canonicalDeck
      };
    },
    buildPersistableDeckHtml(nextDoc) {
      assert.equal(nextDoc, null);
      return '<html>canonical-source</html>';
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
  assert.equal(statusEl.innerHTML, 'saved');
});
