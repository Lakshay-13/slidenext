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

function loadCreateCurrentStudioSessionStateReaders(fileContent, context) {
  context.SlideNextStudioEditorSession ??= editorSession;
  const helperSource = extractFunctionSource(
    fileContent,
    'function createCurrentStudioSessionStateReaders() {',
    '\n\n    function updateCurrentPresentationSessionState(nextState = {}) {'
  );
  vm.runInContext(helperSource, context);
}

test('createCurrentStudioVersionActionContext captures the active presentation version context', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const helperSource = extractFunctionSource(
    fileContent,
    'function createCurrentStudioVersionActionContext() {',
    '\n\n    async function restoreVersion(filename) {'
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
    currentCategory: 'General',
    currentPresentationUrl: '/presentations/onboarding-presentation/index.html',
    currentTitle: 'Project Onboarding',
    studioEditorSessionToken: 11
  };

  vm.createContext(context);
  vm.runInContext(helperSource, context);

  assert.deepEqual(context.createCurrentStudioVersionActionContext(), {
    presentationUrl: '/presentations/onboarding-presentation/index.html',
    presentationTitle: 'Project Onboarding',
    presentationCategory: 'General',
    sessionToken: 11
  });

  context.currentPresentationUrl = '/presentations/ai-tools-presentation/index.html';
  context.currentTitle = 'AI Tools';
  context.currentCategory = 'Technology';
  context.studioEditorSessionToken = 12;

  assert.deepEqual(context.createCurrentStudioVersionActionContext(), {
    presentationUrl: '/presentations/ai-tools-presentation/index.html',
    presentationTitle: 'AI Tools',
    presentationCategory: 'Technology',
    sessionToken: 12
  });
  assert.equal(calls.length, 2);
  assert.equal(calls[0][0], '/presentations/onboarding-presentation/index.html');
  assert.equal(calls[0][1], 'Project Onboarding');
  assert.equal(calls[0][2], 'General');
  assert.equal(calls[0][3].sessionToken, 11);
  assert.equal(calls[1][0], '/presentations/ai-tools-presentation/index.html');
  assert.equal(calls[1][1], 'AI Tools');
  assert.equal(calls[1][2], 'Technology');
  assert.equal(calls[1][3].sessionToken, 12);
});

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

test('openSaveVersionModal does not open when the save button is disabled', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const openSaveVersionModalSource = extractFunctionSource(
    fileContent,
    'function openSaveVersionModal() {',
    '\n    \n    function closeSaveVersionModal() {'
  );

  const elements = {
    studioSaveBtn: {
      disabled: true
    },
    saveVersionModal: {
      classList: createClassList(['hidden', 'opacity-0']),
      offsetHeight: 0
    },
    saveVersionModalContent: {
      classList: createClassList(['scale-95'])
    },
    versionCheckpointName: {
      value: 'Checkpoint A',
      focusCalls: 0,
      focus() {
        this.focusCalls += 1;
      }
    }
  };

  const context = {
    SlideNextStudioModalVisibility: modalVisibility,
    document: {
      getElementById(id) {
        return elements[id] || null;
      }
    }
  };

  vm.createContext(context);
  vm.runInContext(openSaveVersionModalSource, context);

  context.openSaveVersionModal();

  assert.equal(elements.saveVersionModal.classList.contains('hidden'), true);
  assert.equal(elements.saveVersionModal.classList.contains('opacity-0'), true);
  assert.equal(elements.saveVersionModal.classList.contains('opacity-100'), false);
  assert.equal(elements.saveVersionModalContent.classList.contains('scale-95'), true);
  assert.equal(elements.saveVersionModalContent.classList.contains('scale-100'), false);
  assert.equal(elements.versionCheckpointName.value, 'Checkpoint A');
  assert.equal(elements.versionCheckpointName.focusCalls, 0);
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
  const versionButton = {
    disabled: false
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
        switch (id) {
          case 'studioVersionBtn':
            return versionButton;
          case 'versionsDropdown':
            return versionsDropdown;
          default:
            return null;
        }
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

  versionButton.disabled = true;
  context.toggleVersionDropdown();
  assert.equal(versionsDropdown.classList.contains('hidden'), true);
  assert.deepEqual(loadVersionsCalls, [[
    '/presentations/onboarding-presentation/index.html',
    14
  ]]);
});

test('promptRenameVersion tolerates a missing rename input', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const promptRenameVersionSource = extractFunctionSource(
    fileContent,
    'function promptRenameVersion(filename, currentLabel) {',
    '\n    \n    function closeRenameVersionModal() {'
  );

  const calls = [];
  const elements = {
    renameVersionModal: {
      classList: createClassList(['hidden'])
    },
    renameVersionModalContent: {
      classList: createClassList(['scale-95'])
    },
    confirmRenameVersionBtn: {
      disabled: true,
      textContent: 'Renaming...'
    }
  };

  const context = {
    SlideNextStudioModalVisibility: {
      cancelStudioModalHide(modal) {
        calls.push(['cancelStudioModalHide', modal]);
      },
      scheduleStudioModalCallback(modal, options) {
        calls.push(['scheduleStudioModalCallback', modal]);
        options.callback();
      }
    },
    currentCategory: 'General',
    currentPresentationUrl: '/presentations/onboarding-presentation/index.html',
    currentTitle: 'Project Onboarding',
    createCurrentStudioVersionActionContext() {
      calls.push(['createCurrentStudioVersionActionContext']);
      return {
        presentationUrl: '/presentations/onboarding-presentation/index.html'
      };
    },
    document: {
      getElementById(id) {
        calls.push(['getElementById', id]);
        if (id === 'newVersionNameInput') {
          return null;
        }
        return elements[id] || null;
      }
    },
    renamingFilename: '',
    renamingVersionContext: null,
    studioEditorSessionToken: 21
  };

  vm.createContext(context);
  vm.runInContext(promptRenameVersionSource, context);

  assert.doesNotThrow(() => context.promptRenameVersion('index_20260101_120000_Auto.html', 'Draft Name'));
  assert.equal(context.renamingFilename, 'index_20260101_120000_Auto.html');
  assert.equal(context.renamingVersionContext.presentationUrl, '/presentations/onboarding-presentation/index.html');
  assert.equal(elements.confirmRenameVersionBtn.disabled, false);
  assert.equal(elements.confirmRenameVersionBtn.textContent, 'Rename');
  assert.equal(elements.renameVersionModal.classList.contains('hidden'), false);
  assert.equal(elements.renameVersionModal.classList.contains('opacity-100'), true);
  assert.equal(elements.renameVersionModalContent.classList.contains('scale-95'), false);
  assert.equal(elements.renameVersionModalContent.classList.contains('scale-100'), true);
  assert.ok(calls.some(([name, id]) => name === 'getElementById' && id === 'newVersionNameInput'));
  assert.ok(calls.some(([name]) => name === 'scheduleStudioModalCallback'));
});

test('promptRenameVersion tolerates missing rename modal chrome', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const promptRenameVersionSource = extractFunctionSource(
    fileContent,
    'function promptRenameVersion(filename, currentLabel) {',
    '\n    \n    function closeRenameVersionModal() {'
  );

  const renameInput = {
    value: '',
    focusCalls: 0,
    selectCalls: 0,
    focus() {
      this.focusCalls += 1;
    },
    select() {
      this.selectCalls += 1;
    }
  };
  const calls = [];
  const context = {
    SlideNextStudioModalVisibility: {
      cancelStudioModalHide() {
        calls.push(['cancelStudioModalHide']);
      },
      scheduleStudioModalCallback() {
        calls.push(['scheduleStudioModalCallback']);
      }
    },
    currentCategory: 'General',
    currentPresentationUrl: '/presentations/onboarding-presentation/index.html',
    currentTitle: 'Project Onboarding',
    createCurrentStudioVersionActionContext() {
      calls.push(['createCurrentStudioVersionActionContext']);
      return {
        presentationUrl: '/presentations/onboarding-presentation/index.html'
      };
    },
    document: {
      getElementById(id) {
        calls.push(['getElementById', id]);
        if (id === 'newVersionNameInput') {
          return renameInput;
        }
        return null;
      }
    },
    renamingFilename: '',
    renamingVersionContext: null,
    studioEditorSessionToken: 22
  };

  vm.createContext(context);
  vm.runInContext(promptRenameVersionSource, context);

  assert.doesNotThrow(() => context.promptRenameVersion('index_20260101_120000_Auto.html', 'Draft Name'));
  assert.equal(context.renamingFilename, 'index_20260101_120000_Auto.html');
  assert.equal(context.renamingVersionContext.presentationUrl, '/presentations/onboarding-presentation/index.html');
  assert.equal(renameInput.value, 'Draft Name');
  assert.equal(renameInput.focusCalls, 0);
  assert.equal(renameInput.selectCalls, 0);
  assert.ok(calls.some(([name, id]) => name === 'getElementById' && id === 'renameVersionModal'));
  assert.ok(calls.some(([name, id]) => name === 'getElementById' && id === 'renameVersionModalContent'));
  assert.ok(calls.some(([name, id]) => name === 'getElementById' && id === 'confirmRenameVersionBtn'));
  assert.ok(!calls.some(([name]) => name === 'cancelStudioModalHide'));
  assert.ok(!calls.some(([name]) => name === 'scheduleStudioModalCallback'));
});

test('closeRenameVersionModal tolerates missing rename modal nodes', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const closeRenameVersionModalSource = extractFunctionSource(
    fileContent,
    'function closeRenameVersionModal() {',
    '\n    \n    async function submitRenameVersion() {'
  );

  const calls = [];
  const context = {
    SlideNextStudioModalVisibility: {
      scheduleStudioModalHide() {
        calls.push(['scheduleStudioModalHide']);
      }
    },
    document: {
      getElementById(id) {
        calls.push(['getElementById', id]);
        return null;
      }
    },
    renamingFilename: 'index_20260101_120000_Auto.html',
    renamingVersionContext: {
      presentationUrl: '/presentations/onboarding-presentation/index.html'
    }
  };

  vm.createContext(context);
  vm.runInContext(closeRenameVersionModalSource, context);

  assert.doesNotThrow(() => context.closeRenameVersionModal());
  assert.equal(context.renamingFilename, '');
  assert.equal(context.renamingVersionContext, null);
  assert.deepEqual(calls, [
    ['getElementById', 'renameVersionModal'],
    ['getElementById', 'renameVersionModalContent']
  ]);
});

test('submitRenameVersion no-ops when the rename input is missing', async () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const submitRenameVersionSource = extractFunctionSource(
    fileContent,
    'async function submitRenameVersion() {',
    '\n\n    async function deleteVersion(filename) {'
  );

  const calls = [];
  const context = {
    SlideNextStudioModalVisibility: {
      getCurrentStudioModalVisibilityToken() {
        calls.push(['getCurrentStudioModalVisibilityToken']);
        return 0;
      },
      isStudioModalVisibilityCurrent() {
        calls.push(['isStudioModalVisibilityCurrent']);
        return true;
      }
    },
    createCurrentStudioVersionActionContext() {
      calls.push(['createCurrentStudioVersionActionContext']);
      return {
        presentationUrl: '/presentations/onboarding-presentation/index.html'
      };
    },
    document: {
      getElementById(id) {
        calls.push(['getElementById', id]);
        if (id === 'newVersionNameInput') {
          return null;
        }
        return null;
      }
    },
    fetch() {
      calls.push(['fetch']);
      throw new Error('fetch should not run when the rename input is missing');
    },
    renamingFilename: 'index_20260101_120000_Auto.html',
    renamingVersionContext: {
      presentationUrl: '/presentations/onboarding-presentation/index.html'
    }
  };

  vm.createContext(context);
  vm.runInContext(submitRenameVersionSource, context);

  await assert.doesNotReject(async () => {
    await context.submitRenameVersion();
  });
  assert.deepEqual(calls, [
    ['getElementById', 'newVersionNameInput']
  ]);
});

test('submitRenameVersion tolerates missing rename modal chrome during a successful rename', async () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const submitRenameVersionSource = extractFunctionSource(
    fileContent,
    'async function submitRenameVersion() {',
    '\n\n    async function deleteVersion(filename) {'
  );

  const calls = [];
  const context = {
    SlideNextStudioModalVisibility: {
      getCurrentStudioModalVisibilityToken() {
        calls.push(['getCurrentStudioModalVisibilityToken']);
        return 7;
      },
      createStudioModalVisibilityGuard(modal, visibilityToken) {
        calls.push(['createStudioModalVisibilityGuard', modal, visibilityToken]);
        return () => true;
      },
      isStudioModalVisibilityCurrent() {
        calls.push(['isStudioModalVisibilityCurrent']);
        return true;
      }
    },
    SlideNextStudioVersionActions: {
      async executeStudioRenameVersionRequest(...args) {
        calls.push(['executeStudioRenameVersionRequest', ...args]);
        return { success: true };
      },
      handleStudioVersionListMutationSuccess(renameContext, options) {
        calls.push(['handleStudioVersionListMutationSuccess', renameContext, options.refreshVersionEntries]);
        if (options.isCurrentSession) {
          calls.push(['isCurrentSession', options.isCurrentSession()]);
        }
        if (options.onSuccess) {
          options.onSuccess();
        }
        return true;
      }
    },
    closeRenameVersionModal() {
      calls.push(['closeRenameVersionModal']);
    },
    createCurrentStudioSessionStateReaders() {
      return {
        getCurrentPresentationUrl: () => context.renamingVersionContext.presentationUrl,
        getCurrentSessionToken: () => null
      };
    },
    createCurrentStudioVersionActionContext() {
      calls.push(['createCurrentStudioVersionActionContext']);
      return {
        presentationUrl: '/presentations/onboarding-presentation/index.html'
      };
    },
    document: {
      getElementById(id) {
        calls.push(['getElementById', id]);
        if (id === 'newVersionNameInput') {
          return {
            value: 'Draft Name'
          };
        }
        return null;
      }
    },
    fetch() {
      calls.push(['fetch']);
    },
    loadVersions() {
      calls.push(['loadVersions']);
    },
    renamingFilename: 'index_20260101_120000_Auto.html',
    renamingVersionContext: {
      presentationUrl: '/presentations/onboarding-presentation/index.html'
    }
  };

  vm.createContext(context);
  vm.runInContext(submitRenameVersionSource, context);

  await assert.doesNotReject(async () => {
    await context.submitRenameVersion();
  });
  assert.ok(calls.some(([name, id]) => name === 'getElementById' && id === 'renameVersionModal'));
  assert.ok(calls.some(([name, id]) => name === 'getElementById' && id === 'confirmRenameVersionBtn'));
  assert.ok(calls.some(([name, , visibilityToken]) => name === 'createStudioModalVisibilityGuard' && visibilityToken === 0));
  assert.ok(calls.some(([name]) => name === 'executeStudioRenameVersionRequest'));
  assert.ok(calls.some(([name, , , , options]) => name === 'executeStudioRenameVersionRequest' && options.fetchImpl === context.fetch));
  assert.ok(calls.some(([name]) => name === 'closeRenameVersionModal'));
  assert.ok(calls.filter(([name]) => name === 'handleStudioVersionListMutationSuccess').length === 2);
  assert.ok(calls.some(([name, result]) => name === 'isCurrentSession' && result === true));
});

test('submitRenameVersion reuses the shared rename request helper when available', async () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const submitRenameVersionSource = extractFunctionSource(
    fileContent,
    'async function submitRenameVersion() {',
    '\n\n    async function deleteVersion(filename) {'
  );

  let helperArgs = null;
  let readerCallCount = 0;
  const capturedReaders = [];
  const mutationHandlerOptions = [];
  const calls = [];
  const context = {
    SlideNextStudioModalVisibility: {
      getCurrentStudioModalVisibilityToken() {
        return 7;
      },
      createStudioModalVisibilityGuard() {
        return () => true;
      },
      isStudioModalVisibilityCurrent() {
        return true;
      }
    },
    SlideNextStudioVersionActions: {
      executeStudioRenameVersionRequest: async (...args) => {
        helperArgs = args;
        return { success: true };
      },
      handleStudioVersionListMutationSuccess(renameContext, options) {
        mutationHandlerOptions.push(options);
        calls.push(['handleStudioVersionListMutationSuccess', renameContext, options.refreshVersionEntries]);
        if (options.onSuccess) {
          options.onSuccess();
        }
        return true;
      }
    },
    closeRenameVersionModal() {
      calls.push(['closeRenameVersionModal']);
    },
    createCurrentStudioSessionStateReaders() {
      readerCallCount += 1;
      const readers = {
        getCurrentPresentationUrl: () => context.currentPresentationUrl,
        getCurrentSessionToken: () => context.studioEditorSessionToken
      };
      capturedReaders.push(readers);
      return readers;
    },
    createCurrentStudioVersionActionContext() {
      return {
        presentationUrl: '/presentations/onboarding-presentation/index.html'
      };
    },
    document: {
      getElementById(id) {
        if (id === 'newVersionNameInput') {
          return {
            value: 'Draft Name'
          };
        }
        if (id === 'confirmRenameVersionBtn') {
          return {
            disabled: false,
            textContent: 'Rename'
          };
        }
        return null;
      }
    },
    fetch() {
      throw new Error('submitRenameVersion should pass fetch to the shared rename helper instead of calling it directly');
    },
    currentPresentationUrl: '/presentations/onboarding-presentation/index.html',
    loadVersions() {
      calls.push(['loadVersions']);
    },
    renamingFilename: 'index_20260101_120000_Auto.html',
    renamingVersionContext: {
      presentationUrl: '/presentations/onboarding-presentation/index.html'
    },
    studioEditorSessionToken: 21
  };

  vm.createContext(context);
  vm.runInContext(submitRenameVersionSource, context);

  await context.submitRenameVersion();

  assert.equal(helperArgs[0], 'index_20260101_120000_Auto.html');
  assert.equal(helperArgs[1], 'Draft Name');
  assert.deepEqual(helperArgs[2], {
    presentationUrl: '/presentations/onboarding-presentation/index.html'
  });
  assert.equal(helperArgs[3].fetchImpl, context.fetch);
  assert.equal(readerCallCount, 2);
  assert.equal(mutationHandlerOptions.length, 2);
  assert.equal(mutationHandlerOptions[0].getCurrentPresentationUrl, capturedReaders[0].getCurrentPresentationUrl);
  assert.equal(mutationHandlerOptions[0].getCurrentSessionToken, capturedReaders[0].getCurrentSessionToken);
  assert.equal(mutationHandlerOptions[1].getCurrentPresentationUrl, capturedReaders[1].getCurrentPresentationUrl);
  assert.equal(mutationHandlerOptions[1].getCurrentSessionToken, capturedReaders[1].getCurrentSessionToken);
  assert.equal(mutationHandlerOptions[0].getCurrentPresentationUrl(), '/presentations/onboarding-presentation/index.html');
  assert.equal(mutationHandlerOptions[0].getCurrentSessionToken(), 21);
  assert.equal(mutationHandlerOptions[1].getCurrentPresentationUrl(), '/presentations/onboarding-presentation/index.html');
  assert.equal(mutationHandlerOptions[1].getCurrentSessionToken(), 21);
  assert.ok(calls.some(([name]) => name === 'handleStudioVersionListMutationSuccess'));
  assert.ok(calls.some(([name]) => name === 'closeRenameVersionModal'));

  context.currentPresentationUrl = '/presentations/ai-tools-presentation/index.html';
  context.studioEditorSessionToken = 22;
  assert.equal(mutationHandlerOptions[0].getCurrentPresentationUrl(), '/presentations/ai-tools-presentation/index.html');
  assert.equal(mutationHandlerOptions[0].getCurrentSessionToken(), 22);
  assert.equal(mutationHandlerOptions[1].getCurrentPresentationUrl(), '/presentations/ai-tools-presentation/index.html');
  assert.equal(mutationHandlerOptions[1].getCurrentSessionToken(), 22);
});

test('deleteVersion reuses the shared delete request helper when available', async () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const deleteVersionSource = extractFunctionSource(
    fileContent,
    'async function deleteVersion(filename) {',
    '\n\n    // Slide Elements / Layers List Inspector Panel'
  );

  let helperArgs = null;
  let builderArgs = null;
  let readerCallCount = 0;
  let capturedReaders = null;
  let successOptions = null;
  const calls = [];
  const context = {
    SlideNextStudioVersionActions: {
      createStudioVersionActionContext(presentationUrl, presentationTitle, presentationCategory, options) {
        builderArgs = [presentationUrl, presentationTitle, presentationCategory, options];
        return {
          presentationUrl,
          presentationTitle,
          presentationCategory,
          sessionToken: options.sessionToken
        };
      },
      executeStudioDeleteVersionRequest: async (...args) => {
        helperArgs = args;
        return { success: true };
      },
      handleStudioVersionListMutationSuccess(deleteContext, options) {
        successOptions = options;
        calls.push(['handleStudioVersionListMutationSuccess', deleteContext, options.refreshVersionEntries]);
        return true;
      }
    },
    alert() {
      throw new Error('deleteVersion should not alert on a successful shared helper result');
    },
    confirm() {
      return true;
    },
    currentCategory: 'General',
    currentPresentationUrl: '/presentations/onboarding-presentation/index.html',
    currentTitle: 'Project Onboarding',
    createCurrentStudioVersionActionContext() {
      return context.SlideNextStudioVersionActions.createStudioVersionActionContext(
        context.currentPresentationUrl,
        context.currentTitle,
        context.currentCategory,
        {
          sessionToken: context.studioEditorSessionToken
        }
      );
    },
    createCurrentStudioSessionStateReaders() {
      readerCallCount += 1;
      capturedReaders = {
        getCurrentPresentationUrl: () => context.currentPresentationUrl,
        getCurrentSessionToken: () => context.studioEditorSessionToken
      };
      return capturedReaders;
    },
    fetch() {
      throw new Error('deleteVersion should pass fetch to the shared delete helper instead of calling it directly');
    },
    loadVersions() {
      calls.push(['loadVersions']);
    },
    studioEditorSessionToken: 17
  };

  vm.createContext(context);
  vm.runInContext(deleteVersionSource, context);

  await context.deleteVersion('index_20260101_120000_Auto.html');

  assert.equal(builderArgs[0], '/presentations/onboarding-presentation/index.html');
  assert.equal(builderArgs[1], 'Project Onboarding');
  assert.equal(builderArgs[2], 'General');
  assert.equal(builderArgs[3].sessionToken, 17);
  assert.equal(helperArgs[0], 'index_20260101_120000_Auto.html');
  assert.deepEqual(helperArgs[1], {
    presentationUrl: '/presentations/onboarding-presentation/index.html',
    presentationTitle: 'Project Onboarding',
    presentationCategory: 'General',
    sessionToken: 17
  });
  assert.equal(helperArgs[2].fetchImpl, context.fetch);
  assert.equal(readerCallCount, 1);
  assert.equal(successOptions.getCurrentPresentationUrl, capturedReaders.getCurrentPresentationUrl);
  assert.equal(successOptions.getCurrentSessionToken, capturedReaders.getCurrentSessionToken);
  assert.equal(successOptions.getCurrentPresentationUrl(), '/presentations/onboarding-presentation/index.html');
  assert.equal(successOptions.getCurrentSessionToken(), 17);
  assert.ok(calls.some(([name]) => name === 'handleStudioVersionListMutationSuccess'));

  context.currentPresentationUrl = '/presentations/ai-tools-presentation/index.html';
  context.studioEditorSessionToken = 18;
  assert.equal(successOptions.getCurrentPresentationUrl(), '/presentations/ai-tools-presentation/index.html');
  assert.equal(successOptions.getCurrentSessionToken(), 18);
});

test('restoreVersion tolerates a missing versions dropdown after a successful restore', async () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const restoreVersionSource = extractFunctionSource(
    fileContent,
    'async function restoreVersion(filename) {',
    '\n\n    function promptRenameVersion(filename, currentLabel) {'
  );

  const calls = [];
  const context = {
    SlideNextStudioVersionActions: {
      ...versionActions,
      createStudioVersionActionContext(presentationUrl, presentationTitle, presentationCategory, options) {
        calls.push(['createStudioVersionActionContext', presentationUrl, presentationTitle, presentationCategory, options]);
        return {
          presentationUrl,
          presentationTitle,
          presentationCategory,
          sessionToken: options.sessionToken
        };
      },
      async executeStudioRestoreVersionRequest(...args) {
        calls.push(['executeStudioRestoreVersionRequest', ...args]);
        return { success: true };
      },
      handleStudioRestoreVersionSuccess(restoreContext, options) {
        calls.push(['handleStudioRestoreVersionSuccess', restoreContext, options]);
        options.hideVersionsDropdown();
        options.onSuccess();
        return true;
      }
    },
    alert(message) {
      calls.push(['alert', message]);
    },
    confirm(message) {
      calls.push(['confirm', message]);
      return true;
    },
    currentCategory: 'General',
    currentPresentationUrl: '/presentations/onboarding-presentation/index.html',
    currentTitle: 'Project Onboarding',
    createCurrentStudioVersionActionContext() {
      return context.SlideNextStudioVersionActions.createStudioVersionActionContext(
        context.currentPresentationUrl,
        context.currentTitle,
        context.currentCategory,
        {
          sessionToken: context.studioEditorSessionToken
        }
      );
    },
    createCurrentStudioSessionStateReaders() {
      return {
        getCurrentPresentationUrl: () => context.currentPresentationUrl,
        getCurrentSessionToken: () => context.studioEditorSessionToken
      };
    },
    document: {
      getElementById(id) {
        calls.push(['getElementById', id]);
        if (id === 'versionsDropdown') {
          return null;
        }
        return null;
      }
    },
    fetch() {
      calls.push(['fetch']);
    },
    handleCurrentStudioVersionActionFailure() {
      calls.push(['handleCurrentStudioVersionActionFailure']);
    },
    launchStudioEditor(presentationUrl, presentationTitle, presentationCategory) {
      calls.push(['launchStudioEditor', presentationUrl, presentationTitle, presentationCategory]);
    },
    studioEditorSessionToken: 12
  };

  vm.createContext(context);
  vm.runInContext(restoreVersionSource, context);

  await assert.doesNotReject(async () => {
    await context.restoreVersion('index_20260101_120000_Auto.html');
  });
  assert.ok(calls.some(([name]) => name === 'executeStudioRestoreVersionRequest'));
  assert.ok(calls.some(([name, , , options]) => name === 'executeStudioRestoreVersionRequest' && options.fetchImpl === context.fetch));
  assert.ok(calls.some(([name]) => name === 'createStudioVersionActionContext'));
  assert.ok(calls.some(([name]) => name === 'handleStudioRestoreVersionSuccess'));
  assert.ok(calls.some(([name, id]) => name === 'getElementById' && id === 'versionsDropdown'));
  assert.ok(calls.some(([name, message]) => name === 'alert' && /Rollback successfully restored!/.test(message)));
  assert.ok(!calls.some(([name]) => name === 'handleCurrentStudioVersionActionFailure'));
});

test('restoreVersion reuses the shared restore request helper when available', async () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const restoreVersionSource = extractFunctionSource(
    fileContent,
    'async function restoreVersion(filename) {',
    '\n\n    function promptRenameVersion(filename, currentLabel) {'
  );

  let helperArgs = null;
  let builderArgs = null;
  let readerCallCount = 0;
  let capturedReaders = null;
  let successOptions = null;
  const calls = [];
  const context = {
    SlideNextStudioVersionActions: {
      ...versionActions,
      createStudioVersionActionContext(presentationUrl, presentationTitle, presentationCategory, options) {
        builderArgs = [presentationUrl, presentationTitle, presentationCategory, options];
        return {
          presentationUrl,
          presentationTitle,
          presentationCategory,
          sessionToken: options.sessionToken
        };
      },
      executeStudioRestoreVersionRequest: async (...args) => {
        helperArgs = args;
        return { success: true };
      },
      handleStudioRestoreVersionSuccess(restoreContext, options) {
        successOptions = options;
        calls.push(['handleStudioRestoreVersionSuccess', restoreContext, options]);
        options.hideVersionsDropdown();
        options.onSuccess();
        return true;
      }
    },
    alert(message) {
      calls.push(['alert', message]);
    },
    confirm() {
      return true;
    },
    currentCategory: 'General',
    currentPresentationUrl: '/presentations/onboarding-presentation/index.html',
    currentTitle: 'Project Onboarding',
    createCurrentStudioVersionActionContext() {
      return context.SlideNextStudioVersionActions.createStudioVersionActionContext(
        context.currentPresentationUrl,
        context.currentTitle,
        context.currentCategory,
        {
          sessionToken: context.studioEditorSessionToken
        }
      );
    },
    createCurrentStudioSessionStateReaders() {
      readerCallCount += 1;
      capturedReaders = {
        getCurrentPresentationUrl: () => context.currentPresentationUrl,
        getCurrentSessionToken: () => context.studioEditorSessionToken
      };
      return capturedReaders;
    },
    fetch() {
      throw new Error('restoreVersion should pass fetch to the shared restore helper instead of calling it directly');
    },
    document: {
      getElementById(id) {
        if (id === 'versionsDropdown') {
          return {
            classList: {
              add() {}
            }
          };
        }
        return null;
      }
    },
    handleCurrentStudioVersionActionFailure() {
      throw new Error('restoreVersion should not use the failure handler for a successful shared helper result');
    },
    launchStudioEditor() {},
    studioEditorSessionToken: 13
  };

  vm.createContext(context);
  vm.runInContext(restoreVersionSource, context);

  await context.restoreVersion('index_20260101_120000_Auto.html');

  assert.equal(builderArgs[0], '/presentations/onboarding-presentation/index.html');
  assert.equal(builderArgs[1], 'Project Onboarding');
  assert.equal(builderArgs[2], 'General');
  assert.equal(builderArgs[3].sessionToken, 13);
  assert.equal(helperArgs[0], 'index_20260101_120000_Auto.html');
  assert.deepEqual(helperArgs[1], {
    presentationUrl: '/presentations/onboarding-presentation/index.html',
    presentationTitle: 'Project Onboarding',
    presentationCategory: 'General',
    sessionToken: 13
  });
  assert.equal(helperArgs[2].fetchImpl, context.fetch);
  assert.equal(readerCallCount, 1);
  assert.equal(successOptions.getCurrentPresentationUrl, capturedReaders.getCurrentPresentationUrl);
  assert.equal(successOptions.getCurrentSessionToken, capturedReaders.getCurrentSessionToken);
  assert.equal(successOptions.getCurrentPresentationUrl(), '/presentations/onboarding-presentation/index.html');
  assert.equal(successOptions.getCurrentSessionToken(), 13);
  assert.ok(calls.some(([name]) => name === 'handleStudioRestoreVersionSuccess'));
  assert.ok(calls.some(([name, message]) => name === 'alert' && /Rollback successfully restored!/.test(message)));

  context.currentPresentationUrl = '/presentations/ai-tools-presentation/index.html';
  context.studioEditorSessionToken = 14;
  assert.equal(successOptions.getCurrentPresentationUrl(), '/presentations/ai-tools-presentation/index.html');
  assert.equal(successOptions.getCurrentSessionToken(), 14);
});

test('loadVersions reuses the shared session reader helper when delegating to the version history loader', async () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const loadVersionsSource = extractFunctionSource(
    fileContent,
    'async function loadVersions(presentationUrl = currentPresentationUrl, sessionToken = studioEditorSessionToken) {',
    '\n\n    // Rollback backup version'
  );

  let capturedOptions = null;
  let readerCallCount = 0;
  let capturedReaders = null;
  const errorCalls = [];
  const context = {
    SlideNextStudioVersionHistory: {
      async loadStudioVersionHistory(presentationUrl, options) {
        capturedOptions = options;
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
      readerCallCount += 1;
      capturedReaders = {
        getCurrentPresentationUrl: () => context.currentPresentationUrl,
        getCurrentSessionToken: () => context.studioEditorSessionToken
      };
      return capturedReaders;
    },
    console: {
      error(...args) {
        errorCalls.push(args);
      }
    },
    currentPresentationUrl: '/presentations/onboarding-presentation/index.html',
    renderVersionsListCalls: [],
    renderVersionsList(presentationUrl, versions) {
      context.renderVersionsListCalls.push([presentationUrl, versions]);
    },
    studioEditorSessionToken: 18
  };

  vm.createContext(context);
  vm.runInContext(loadVersionsSource, context);

  await context.loadVersions(
    '/presentations/onboarding-presentation/index.html',
    18
  );

  assert.equal(readerCallCount, 1);
  assert.equal(capturedOptions.sessionToken, 18);
  assert.equal(capturedOptions.getCurrentPresentationUrl, capturedReaders.getCurrentPresentationUrl);
  assert.equal(capturedOptions.getCurrentSessionToken, capturedReaders.getCurrentSessionToken);
  assert.equal(typeof capturedOptions.getCurrentPresentationUrl, 'function');
  assert.equal(typeof capturedOptions.getCurrentSessionToken, 'function');
  assert.equal(capturedOptions.getCurrentPresentationUrl(), '/presentations/onboarding-presentation/index.html');
  assert.equal(capturedOptions.getCurrentSessionToken(), 18);
  assert.deepEqual(context.renderVersionsListCalls, [[
    '/presentations/onboarding-presentation/index.html',
    [
      {
        filename: 'index_20260101_120000_Auto.html',
        createdAt: '2026-01-01T12:00:00.000Z'
      }
    ]
  ]]);
  assert.deepEqual(errorCalls, []);

  context.currentPresentationUrl = '/presentations/ai-tools-presentation/index.html';
  context.studioEditorSessionToken = 19;
  assert.equal(capturedOptions.getCurrentPresentationUrl(), '/presentations/ai-tools-presentation/index.html');
  assert.equal(capturedOptions.getCurrentSessionToken(), 19);
});

test('createCurrentStudioSessionStateReaders exposes live presentation and session getters', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  let capturedOptions = null;
  const context = {
    SlideNextStudioEditorSession: {
      ...editorSession,
      createStudioSessionStateReaders(options) {
        capturedOptions = options;
        return editorSession.createStudioSessionStateReaders(options);
      }
    },
    currentPresentationUrl: '/presentations/onboarding-presentation/index.html',
    studioEditorSessionToken: 4
  };

  vm.createContext(context);
  loadCreateCurrentStudioSessionStateReaders(fileContent, context);

  const options = context.createCurrentStudioSessionStateReaders();
  assert.equal(options.getCurrentPresentationUrl(), '/presentations/onboarding-presentation/index.html');
  assert.equal(options.getCurrentSessionToken(), 4);
  assert.equal(capturedOptions.getCurrentPresentationUrl(), '/presentations/onboarding-presentation/index.html');
  assert.equal(capturedOptions.getCurrentSessionToken(), 4);

  context.currentPresentationUrl = '/presentations/ai-tools-presentation/index.html';
  context.studioEditorSessionToken = 5;
  assert.equal(options.getCurrentPresentationUrl(), '/presentations/ai-tools-presentation/index.html');
  assert.equal(options.getCurrentSessionToken(), 5);
  assert.equal(capturedOptions.getCurrentPresentationUrl(), '/presentations/ai-tools-presentation/index.html');
  assert.equal(capturedOptions.getCurrentSessionToken(), 5);
});
