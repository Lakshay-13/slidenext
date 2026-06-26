const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');
const editorPersistence = require('../shared/studio-editor-persistence.js');

function extractFunctionSource(fileContent, startMarker, endMarker) {
  const start = fileContent.indexOf(startMarker);
  assert.notEqual(start, -1, `Missing start marker: ${startMarker}`);
  const end = fileContent.indexOf(endMarker, start);
  assert.notEqual(end, -1, `Missing end marker: ${endMarker}`);
  return fileContent.slice(start, end);
}

test('submitSaveVersion keeps the save button idle when the editor frame is unavailable', async () => {
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
    buildPersistableDeckHtml() {
      return '<html></html>';
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

  assert.deepEqual(alerts, ['Save version failed: editor frame is unavailable.']);
  assert.equal(closeModalCalls, 0);
  assert.equal(saveVersionCalls, 0);
  assert.equal(saveBtnEl.disabled, false);
  assert.equal(saveBtnEl.innerHTML, '<span>Save Version</span>');
  assert.equal(statusEl.innerHTML, 'Saved to disk');
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

test('executeSaveAutoVersion skips persistence when the shared iframe accessor has no live document', async () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const executeSaveAutoVersionSource = extractFunctionSource(
    fileContent,
    'async function executeSaveAutoVersion(label, presentationUrl = currentPresentationUrl, sessionToken = studioEditorSessionToken) {',
    '\n\n    // 7. Versions and Backups listing'
  );

  let saveVersionCalls = 0;
  const context = {
    buildPersistableDeckHtml() {
      return '<html>persisted</html>';
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

test('triggerAutoSave skips persistence when the shared iframe accessor has no live document', async () => {
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
      return '<html>persisted</html>';
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
    isCurrentDeckHtmlPersisted() {
      return false;
    },
    isStaleEditorPersistenceTask() {
      return false;
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
  assert.match(statusEl.innerHTML, /Saving/);
  assert.equal(typeof scheduledCallback, 'function');

  await scheduledCallback();

  assert.equal(buildPersistableDeckHtmlCalls, 0);
  assert.equal(saveRequestBodyCalls, 0);
  assert.equal(fetchCalls, 0);
});
