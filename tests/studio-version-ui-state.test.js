const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const modalVisibility = require('../shared/studio-modal-visibility.js');
const editorSession = require('../shared/studio-editor-session.js');
const versionActions = require('../shared/studio-version-actions.js');

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

function loadCreateCurrentStudioSessionStateOptions(fileContent, context) {
  context.SlideNextStudioEditorSession ??= editorSession;
  const helperSource = extractFunctionSource(
    fileContent,
    'function createCurrentStudioSessionStateOptions(options = {}) {',
    '\n\n    function createCurrentStudioFrameLoadHandler('
  );
  vm.runInContext(helperSource, context);
}

function loadHandleCurrentStudioVersionListMutationSuccess(fileContent, context) {
  loadCreateCurrentStudioSessionStateOptions(fileContent, context);
  const helperSource = extractFunctionSource(
    fileContent,
    'function handleCurrentStudioVersionListMutationSuccess(versionActionContext, options = {}) {',
    '\n\n    function handleCurrentStudioVersionActionFailure(versionActionContext, options = {}) {'
  );
  vm.runInContext(helperSource, context);
}

function loadHandleCurrentStudioVersionActionFailure(fileContent, context) {
  loadCreateCurrentStudioSessionStateOptions(fileContent, context);
  const helperSource = extractFunctionSource(
    fileContent,
    'function handleCurrentStudioVersionActionFailure(versionActionContext, options = {}) {',
    '\n\n    function handleCurrentStudioVersionRestoreSuccess(versionActionContext, options = {}) {'
  );
  vm.runInContext(helperSource, context);
}

function loadHandleCurrentStudioVersionRestoreSuccess(fileContent, context) {
  loadCreateCurrentStudioSessionStateOptions(fileContent, context);
  const helperSource = extractFunctionSource(
    fileContent,
    'function handleCurrentStudioVersionRestoreSuccess(versionActionContext, options = {}) {',
    '\n\n    // Rollback backup version'
  );
  vm.runInContext(helperSource, context);
}

test('resetStudioVersionUiState hides open version chrome and clears modal state', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const resetStudioVersionUiStateSource = extractFunctionSource(
    fileContent,
    'function resetStudioVersionUiState(options = {}) {',
    '\n\n    function resetStudioSaveButtonState() {'
  );

  const elements = {
    versionsDropdown: {
      classList: createClassList()
    },
    versionsList: {
      innerHTML: '<div>Old versions</div>'
    },
    saveVersionModal: {
      classList: createClassList(['opacity-100'])
    },
    saveVersionModalContent: {
      classList: createClassList(['scale-100'])
    },
    versionCheckpointName: {
      value: 'Checkpoint A'
    },
    renameVersionModal: {
      classList: createClassList(['opacity-100'])
    },
    renameVersionModalContent: {
      classList: createClassList(['scale-100'])
    },
    newVersionNameInput: {
      value: 'Draft Name'
    },
    confirmRenameVersionBtn: {
      disabled: true,
      textContent: 'Renaming...'
    }
  };

  const documentStub = {
    getElementById(id) {
      return elements[id] || null;
    }
  };

  const context = {
    SlideNextStudioModalVisibility: modalVisibility,
    document: documentStub,
    renamingFilename: 'draft.html',
    renamingVersionContext: { presentationUrl: '/presentations/onboarding-presentation/index.html' }
  };

  vm.createContext(context);
  vm.runInContext(resetStudioVersionUiStateSource, context);

  const saveModalTokenBefore = modalVisibility.getCurrentStudioModalVisibilityToken(elements.saveVersionModal);
  const renameModalTokenBefore = modalVisibility.getCurrentStudioModalVisibilityToken(elements.renameVersionModal);

  context.resetStudioVersionUiState({ isLoading: true });

  assert.equal(elements.versionsDropdown.classList.contains('hidden'), true);
  assert.match(elements.versionsList.innerHTML, /Loading versions\.\.\./);
  assert.equal(elements.versionCheckpointName.value, '');
  assert.equal(elements.saveVersionModal.classList.contains('hidden'), true);
  assert.equal(elements.saveVersionModal.classList.contains('opacity-0'), true);
  assert.equal(elements.saveVersionModal.classList.contains('opacity-100'), false);
  assert.equal(elements.saveVersionModalContent.classList.contains('scale-95'), true);
  assert.equal(elements.saveVersionModalContent.classList.contains('scale-100'), false);

  assert.equal(context.renamingFilename, '');
  assert.equal(context.renamingVersionContext, null);
  assert.equal(elements.newVersionNameInput.value, '');
  assert.equal(elements.confirmRenameVersionBtn.disabled, false);
  assert.equal(elements.confirmRenameVersionBtn.textContent, 'Rename');
  assert.equal(elements.renameVersionModal.classList.contains('hidden'), true);
  assert.equal(elements.renameVersionModal.classList.contains('opacity-0'), true);
  assert.equal(elements.renameVersionModal.classList.contains('opacity-100'), false);
  assert.equal(elements.renameVersionModalContent.classList.contains('scale-95'), true);
  assert.equal(elements.renameVersionModalContent.classList.contains('scale-100'), false);

  context.resetStudioVersionUiState();
  assert.match(elements.versionsList.innerHTML, /No versions saved yet/);

  assert.equal(
    modalVisibility.getCurrentStudioModalVisibilityToken(elements.saveVersionModal),
    saveModalTokenBefore + 2
  );
  assert.equal(
    modalVisibility.getCurrentStudioModalVisibilityToken(elements.renameVersionModal),
    renameModalTokenBefore + 2
  );
});

test('toggleVersionDropdown refreshes version history only when opening the menu', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const toggleVersionDropdownSource = extractFunctionSource(
    fileContent,
    'function toggleVersionDropdown() {',
    '\n\n    function renderVersionsList'
  );

  const loadVersionsCalls = [];
  const versionsDropdown = {
    classList: createClassList(['hidden'])
  };
  versionsDropdown.classList.toggle = function toggle(value) {
    if (this.contains(value)) {
      this.remove(value);
      return false;
    }
    this.add(value);
    return true;
  };

  const context = {
    currentPresentationUrl: '/presentations/onboarding-presentation/index.html',
    document: {
      getElementById(id) {
        assert.equal(id, 'versionsDropdown');
        return versionsDropdown;
      }
    },
    loadVersions(presentationUrl, sessionToken) {
      loadVersionsCalls.push([presentationUrl, sessionToken]);
    },
    studioEditorSessionToken: 14
  };

  vm.createContext(context);
  vm.runInContext(toggleVersionDropdownSource, context);

  context.toggleVersionDropdown();
  assert.equal(versionsDropdown.classList.contains('hidden'), false);
  assert.deepEqual(loadVersionsCalls, [[
    '/presentations/onboarding-presentation/index.html',
    14
  ]]);

  context.toggleVersionDropdown();
  assert.equal(versionsDropdown.classList.contains('hidden'), true);
  assert.deepEqual(loadVersionsCalls, [[
    '/presentations/onboarding-presentation/index.html',
    14
  ]]);
});

test('loadCurrentStudioVersionHistory reuses current session readers when delegating to the version history loader', async () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const loadCurrentStudioVersionHistorySource = extractFunctionSource(
    fileContent,
    'async function loadCurrentStudioVersionHistory(',
    '\n\n    // Fetch versions checklist'
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
    SlideNextStudioVersionHistory: {
      createStudioVersionHistoryLoadOptions(options) {
        capturedOptions = options;
        return options;
      },
      async loadStudioVersionHistory(presentationUrl, options) {
        const versions = [
          {
            filename: 'index_20260101_120000_Auto.html',
            createdAt: '2026-01-01T12:00:00.000Z'
          }
        ];
        options.commitVersionEntries(versions);
        return versions;
      }
    },
    createCurrentStudioSessionStateReaders() {
      return currentStudioSessionStateReaders;
    },
    currentPresentationUrl: '/presentations/onboarding-presentation/index.html',
    renderVersionsListCalls: [],
    renderVersionsList(presentationUrl, versions) {
      context.renderVersionsListCalls.push([presentationUrl, versions]);
    },
    studioEditorSessionToken: 18
  };

  vm.createContext(context);
  loadCreateCurrentStudioSessionStateOptions(fileContent, context);
  vm.runInContext(loadCurrentStudioVersionHistorySource, context);

  const versions = await context.loadCurrentStudioVersionHistory(
    '/presentations/onboarding-presentation/index.html',
    18
  );

  assert.deepEqual(versions, [
    {
      filename: 'index_20260101_120000_Auto.html',
      createdAt: '2026-01-01T12:00:00.000Z'
    }
  ]);
  assert.equal(capturedOptions.sessionToken, 18);
  assert.equal(capturedOptions.getCurrentPresentationUrl, currentStudioSessionStateReaders.getCurrentPresentationUrl);
  assert.equal(capturedOptions.getCurrentSessionToken, currentStudioSessionStateReaders.getCurrentSessionToken);
  assert.deepEqual(context.renderVersionsListCalls, [[
    '/presentations/onboarding-presentation/index.html',
    versions
  ]]);
});

test('createCurrentStudioVersionActionContext captures the active editor deck identity and session', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const createCurrentStudioVersionActionContextSource = extractFunctionSource(
    fileContent,
    'function createCurrentStudioVersionActionContext() {',
    '\n\n    // Rollback backup version'
  );

  const calls = [];
  const context = {
    SlideNextStudioVersionActions: {
      createStudioVersionActionContext(presentationUrl, presentationTitle, presentationCategory, options) {
        calls.push([presentationUrl, presentationTitle, presentationCategory, options]);
        return {
          presentationUrl,
          presentationTitle,
          presentationCategory,
          sessionToken: options.sessionToken
        };
      }
    },
    currentPresentationUrl: '/presentations/onboarding-presentation/index.html',
    currentTitle: 'Project Onboarding',
    currentCategory: 'General',
    studioEditorSessionToken: 21
  };

  vm.createContext(context);
  vm.runInContext(createCurrentStudioVersionActionContextSource, context);

  assert.deepEqual(
    context.createCurrentStudioVersionActionContext(),
    {
      presentationUrl: '/presentations/onboarding-presentation/index.html',
      presentationTitle: 'Project Onboarding',
      presentationCategory: 'General',
      sessionToken: 21
    }
  );
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], '/presentations/onboarding-presentation/index.html');
  assert.equal(calls[0][1], 'Project Onboarding');
  assert.equal(calls[0][2], 'General');
  assert.equal(calls[0][3].sessionToken, 21);
});

test('handleCurrentStudioVersionListMutationSuccess reuses current session readers and refreshes version entries by default', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const calls = [];
  const context = {
    SlideNextStudioVersionActions: {
      ...versionActions,
      handleStudioVersionListMutationSuccess(versionActionContext, options) {
        calls.push(['handleStudioVersionListMutationSuccess', versionActionContext, options]);
        return true;
      }
    },
    createCurrentStudioSessionStateReaders() {
      return {
        getCurrentPresentationUrl: () => '/presentations/onboarding-presentation/index.html',
        getCurrentSessionToken: () => 9
      };
    },
    loadVersions(presentationUrl, sessionToken) {
      calls.push(['loadVersions', presentationUrl, sessionToken]);
    }
  };

  vm.createContext(context);
  loadHandleCurrentStudioVersionListMutationSuccess(fileContent, context);

  const versionActionContext = {
    presentationUrl: '/presentations/onboarding-presentation/index.html',
    sessionToken: 9
  };
  const result = context.handleCurrentStudioVersionListMutationSuccess(versionActionContext, {
    onSuccess() {
      calls.push(['onSuccess']);
    }
  });

  assert.equal(result, true);
  assert.equal(calls[0][0], 'handleStudioVersionListMutationSuccess');
  assert.equal(calls[0][1], versionActionContext);
  assert.equal(typeof calls[0][2].getCurrentPresentationUrl, 'function');
  assert.equal(typeof calls[0][2].getCurrentSessionToken, 'function');
  assert.equal(calls[0][2].getCurrentPresentationUrl(), '/presentations/onboarding-presentation/index.html');
  assert.equal(calls[0][2].getCurrentSessionToken(), 9);
  calls[0][2].onSuccess();
  calls[0][2].refreshVersionEntries('/presentations/onboarding-presentation/index.html', 9);
  assert.deepEqual(calls.slice(1), [
    ['onSuccess'],
    ['loadVersions', '/presentations/onboarding-presentation/index.html', 9]
  ]);
});

test('handleCurrentStudioVersionListMutationSuccess can skip version refresh wiring', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const calls = [];
  const context = {
    SlideNextStudioVersionActions: {
      ...versionActions,
      handleStudioVersionListMutationSuccess(versionActionContext, options) {
        calls.push(['handleStudioVersionListMutationSuccess', versionActionContext, options]);
        return false;
      }
    },
    createCurrentStudioSessionStateReaders() {
      return {
        getCurrentPresentationUrl: () => '/presentations/onboarding-presentation/index.html',
        getCurrentSessionToken: () => 10
      };
    },
    loadVersions() {
      calls.push(['loadVersions']);
    }
  };

  vm.createContext(context);
  loadHandleCurrentStudioVersionListMutationSuccess(fileContent, context);

  const result = context.handleCurrentStudioVersionListMutationSuccess(
    {
      presentationUrl: '/presentations/onboarding-presentation/index.html',
      sessionToken: 10
    },
    {
      shouldRefreshVersionEntries: false,
      isCurrentSession: () => true
    }
  );

  assert.equal(result, false);
  assert.equal(calls[0][0], 'handleStudioVersionListMutationSuccess');
  assert.equal(calls[0][2].refreshVersionEntries, undefined);
  assert.equal(typeof calls[0][2].isCurrentSession, 'function');
  assert.equal(calls.length, 1);
});

test('handleCurrentStudioVersionActionFailure reuses current session readers for failure handling', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const calls = [];
  const context = {
    SlideNextStudioVersionActions: {
      ...versionActions,
      handleStudioVersionActionFailure(versionActionContext, options) {
        calls.push(['handleStudioVersionActionFailure', versionActionContext, options]);
        return true;
      }
    },
    createCurrentStudioSessionStateReaders() {
      return {
        getCurrentPresentationUrl: () => '/presentations/onboarding-presentation/index.html',
        getCurrentSessionToken: () => 11
      };
    }
  };

  vm.createContext(context);
  loadHandleCurrentStudioVersionActionFailure(fileContent, context);

  const versionActionContext = {
    presentationUrl: '/presentations/onboarding-presentation/index.html',
    sessionToken: 11
  };
  const result = context.handleCurrentStudioVersionActionFailure(versionActionContext, {
    isCurrentSession: () => true,
    onFailure() {
      calls.push(['onFailure']);
    }
  });

  assert.equal(result, true);
  assert.equal(calls[0][0], 'handleStudioVersionActionFailure');
  assert.equal(calls[0][1], versionActionContext);
  assert.equal(typeof calls[0][2].getCurrentPresentationUrl, 'function');
  assert.equal(typeof calls[0][2].getCurrentSessionToken, 'function');
  assert.equal(typeof calls[0][2].isCurrentSession, 'function');
  assert.equal(calls[0][2].getCurrentPresentationUrl(), '/presentations/onboarding-presentation/index.html');
  assert.equal(calls[0][2].getCurrentSessionToken(), 11);
  calls[0][2].onFailure();
  assert.deepEqual(calls.slice(1), [['onFailure']]);
});

test('handleCurrentStudioVersionRestoreSuccess reuses current session readers and restore hooks', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const calls = [];
  const context = {
    SlideNextStudioVersionActions: {
      ...versionActions,
      handleStudioRestoreVersionSuccess(versionActionContext, options) {
        calls.push(['handleStudioRestoreVersionSuccess', versionActionContext, options]);
        return true;
      }
    },
    createCurrentStudioSessionStateReaders() {
      return {
        getCurrentPresentationUrl: () => '/presentations/onboarding-presentation/index.html',
        getCurrentSessionToken: () => 12
      };
    }
  };

  vm.createContext(context);
  loadHandleCurrentStudioVersionRestoreSuccess(fileContent, context);

  const versionActionContext = {
    presentationUrl: '/presentations/onboarding-presentation/index.html',
    sessionToken: 12
  };
  const result = context.handleCurrentStudioVersionRestoreSuccess(versionActionContext, {
    onSuccess() {
      calls.push(['onSuccess']);
    },
    hideVersionsDropdown() {
      calls.push(['hideVersionsDropdown']);
    },
    relaunchEditor() {
      calls.push(['relaunchEditor']);
    }
  });

  assert.equal(result, true);
  assert.equal(calls[0][0], 'handleStudioRestoreVersionSuccess');
  assert.equal(calls[0][1], versionActionContext);
  assert.equal(typeof calls[0][2].getCurrentPresentationUrl, 'function');
  assert.equal(typeof calls[0][2].getCurrentSessionToken, 'function');
  assert.equal(calls[0][2].getCurrentPresentationUrl(), '/presentations/onboarding-presentation/index.html');
  assert.equal(calls[0][2].getCurrentSessionToken(), 12);
  calls[0][2].onSuccess();
  calls[0][2].hideVersionsDropdown();
  calls[0][2].relaunchEditor();
  assert.deepEqual(calls.slice(1), [
    ['onSuccess'],
    ['hideVersionsDropdown'],
    ['relaunchEditor']
  ]);
});

test('createCurrentStudioSessionStateReaders exposes live presentation and session getters', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const createCurrentStudioSessionStateReadersSource = extractFunctionSource(
    fileContent,
    'function createCurrentStudioSessionStateReaders() {',
    '\n\n    function resetEditorPersistenceTimers() {'
  );

  const context = {
    currentPresentationUrl: '/presentations/onboarding-presentation/index.html',
    studioEditorSessionToken: 4
  };

  vm.createContext(context);
  vm.runInContext(createCurrentStudioSessionStateReadersSource, context);

  const readers = context.createCurrentStudioSessionStateReaders();
  assert.equal(readers.getCurrentPresentationUrl(), '/presentations/onboarding-presentation/index.html');
  assert.equal(readers.getCurrentSessionToken(), 4);

  context.currentPresentationUrl = '/presentations/ai-tools-presentation/index.html';
  context.studioEditorSessionToken = 5;
  assert.equal(readers.getCurrentPresentationUrl(), '/presentations/ai-tools-presentation/index.html');
  assert.equal(readers.getCurrentSessionToken(), 5);
});
