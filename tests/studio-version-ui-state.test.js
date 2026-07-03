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
  loadCreateCurrentStudioVersionActionHandlerOptions(fileContent, context);
  const helperSource = extractFunctionSource(
    fileContent,
    'function handleCurrentStudioVersionListMutationSuccess(versionActionContext, options = {}) {',
    '\n\n    function handleCurrentStudioVersionActionFailure(versionActionContext, options = {}) {'
  );
  vm.runInContext(helperSource, context);
}

function loadHandleCurrentStudioVersionActionFailure(fileContent, context) {
  loadCreateCurrentStudioSessionStateOptions(fileContent, context);
  loadCreateCurrentStudioVersionActionHandlerOptions(fileContent, context);
  const helperSource = extractFunctionSource(
    fileContent,
    'function handleCurrentStudioVersionActionFailure(versionActionContext, options = {}) {',
    '\n\n    function handleCurrentStudioVersionRestoreSuccess(versionActionContext, options = {}) {'
  );
  vm.runInContext(helperSource, context);
}

function loadHandleCurrentStudioVersionRestoreSuccess(fileContent, context) {
  loadCreateCurrentStudioSessionStateOptions(fileContent, context);
  loadCreateCurrentStudioVersionActionHandlerOptions(fileContent, context);
  const helperSource = extractFunctionSource(
    fileContent,
    'function handleCurrentStudioVersionRestoreSuccess(versionActionContext, options = {}) {',
    '\n\n    // Rollback backup version'
  );
  vm.runInContext(helperSource, context);
}

function loadCreateCurrentStudioVersionActionHandlerOptions(fileContent, context) {
  loadCreateCurrentStudioSessionStateOptions(fileContent, context);
  context.SlideNextStudioVersionActions ??= versionActions;
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
    renamingVersionContext: null
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
    renamingVersionContext: null
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
      }
    },
    closeRenameVersionModal() {
      calls.push(['closeRenameVersionModal']);
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
    handleCurrentStudioVersionActionFailure() {
      calls.push(['handleCurrentStudioVersionActionFailure']);
    },
    handleCurrentStudioVersionListMutationSuccess(renameContext, options) {
      calls.push(['handleCurrentStudioVersionListMutationSuccess', renameContext, options.shouldRefreshVersionEntries]);
      if (options.isCurrentSession) {
        calls.push(['isCurrentSession', options.isCurrentSession()]);
      }
      if (options.onSuccess) {
        options.onSuccess();
      }
      return true;
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
  assert.ok(calls.filter(([name]) => name === 'handleCurrentStudioVersionListMutationSuccess').length === 2);
  assert.ok(calls.some(([name, result]) => name === 'isCurrentSession' && result === true));
  assert.ok(!calls.some(([name]) => name === 'handleCurrentStudioVersionActionFailure'));
});

test('submitRenameVersion reuses the shared rename request helper when available', async () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const submitRenameVersionSource = extractFunctionSource(
    fileContent,
    'async function submitRenameVersion() {',
    '\n\n    async function deleteVersion(filename) {'
  );

  let helperArgs = null;
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
      }
    },
    closeRenameVersionModal() {
      calls.push(['closeRenameVersionModal']);
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
    handleCurrentStudioVersionActionFailure() {
      throw new Error('submitRenameVersion should not use the failure handler for a successful shared helper result');
    },
    handleCurrentStudioVersionListMutationSuccess(renameContext, options) {
      calls.push(['handleCurrentStudioVersionListMutationSuccess', renameContext, options.shouldRefreshVersionEntries]);
      if (options.onSuccess) {
        options.onSuccess();
      }
      return true;
    },
    renamingFilename: 'index_20260101_120000_Auto.html',
    renamingVersionContext: {
      presentationUrl: '/presentations/onboarding-presentation/index.html'
    }
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
  assert.ok(calls.some(([name]) => name === 'handleCurrentStudioVersionListMutationSuccess'));
  assert.ok(calls.some(([name]) => name === 'closeRenameVersionModal'));
});

test('deleteVersion reuses the shared delete request helper when available', async () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const deleteVersionSource = extractFunctionSource(
    fileContent,
    'async function deleteVersion(filename) {',
    '\n\n    // Slide Elements / Layers List Inspector Panel'
  );

  let helperArgs = null;
  const calls = [];
  const context = {
    SlideNextStudioVersionActions: {
      executeStudioDeleteVersionRequest: async (...args) => {
        helperArgs = args;
        return { success: true };
      }
    },
    alert() {
      throw new Error('deleteVersion should not alert on a successful shared helper result');
    },
    confirm() {
      return true;
    },
    createCurrentStudioVersionActionContext() {
      return {
        presentationUrl: '/presentations/onboarding-presentation/index.html'
      };
    },
    fetch() {
      throw new Error('deleteVersion should pass fetch to the shared delete helper instead of calling it directly');
    },
    handleCurrentStudioVersionActionFailure() {
      throw new Error('deleteVersion should not use the failure handler for a successful shared helper result');
    },
    handleCurrentStudioVersionListMutationSuccess(deleteContext) {
      calls.push(['handleCurrentStudioVersionListMutationSuccess', deleteContext]);
      return true;
    }
  };

  vm.createContext(context);
  vm.runInContext(deleteVersionSource, context);

  await context.deleteVersion('index_20260101_120000_Auto.html');

  assert.equal(helperArgs[0], 'index_20260101_120000_Auto.html');
  assert.deepEqual(helperArgs[1], {
    presentationUrl: '/presentations/onboarding-presentation/index.html'
  });
  assert.equal(helperArgs[2].fetchImpl, context.fetch);
  assert.ok(calls.some(([name]) => name === 'handleCurrentStudioVersionListMutationSuccess'));
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
      async executeStudioRestoreVersionRequest(...args) {
        calls.push(['executeStudioRestoreVersionRequest', ...args]);
        return { success: true };
      }
    },
    alert(message) {
      calls.push(['alert', message]);
    },
    confirm(message) {
      calls.push(['confirm', message]);
      return true;
    },
    createCurrentStudioVersionActionContext() {
      calls.push(['createCurrentStudioVersionActionContext']);
      return {
        presentationUrl: '/presentations/onboarding-presentation/index.html',
        presentationTitle: 'Project Onboarding',
        presentationCategory: 'General'
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
    handleCurrentStudioVersionRestoreSuccess(restoreContext, options) {
      calls.push(['handleCurrentStudioVersionRestoreSuccess', restoreContext, options]);
      options.hideVersionsDropdown();
      options.onSuccess();
      return true;
    },
    launchStudioEditor(presentationUrl, presentationTitle, presentationCategory) {
      calls.push(['launchStudioEditor', presentationUrl, presentationTitle, presentationCategory]);
    }
  };

  vm.createContext(context);
  vm.runInContext(restoreVersionSource, context);

  await assert.doesNotReject(async () => {
    await context.restoreVersion('index_20260101_120000_Auto.html');
  });
  assert.ok(calls.some(([name]) => name === 'executeStudioRestoreVersionRequest'));
  assert.ok(calls.some(([name, , , options]) => name === 'executeStudioRestoreVersionRequest' && options.fetchImpl === context.fetch));
  assert.ok(calls.some(([name]) => name === 'handleCurrentStudioVersionRestoreSuccess'));
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
  const calls = [];
  const context = {
    SlideNextStudioVersionActions: {
      executeStudioRestoreVersionRequest: async (...args) => {
        helperArgs = args;
        return { success: true };
      }
    },
    alert(message) {
      calls.push(['alert', message]);
    },
    confirm() {
      return true;
    },
    createCurrentStudioVersionActionContext() {
      return {
        presentationUrl: '/presentations/onboarding-presentation/index.html',
        presentationTitle: 'Project Onboarding',
        presentationCategory: 'General'
      };
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
    handleCurrentStudioVersionRestoreSuccess(restoreContext, options) {
      calls.push(['handleCurrentStudioVersionRestoreSuccess', restoreContext, options]);
      options.hideVersionsDropdown();
      options.onSuccess();
      return true;
    },
    launchStudioEditor() {}
  };

  vm.createContext(context);
  vm.runInContext(restoreVersionSource, context);

  await context.restoreVersion('index_20260101_120000_Auto.html');

  assert.equal(helperArgs[0], 'index_20260101_120000_Auto.html');
  assert.deepEqual(helperArgs[1], {
    presentationUrl: '/presentations/onboarding-presentation/index.html',
    presentationTitle: 'Project Onboarding',
    presentationCategory: 'General'
  });
  assert.equal(helperArgs[2].fetchImpl, context.fetch);
  assert.ok(calls.some(([name]) => name === 'handleCurrentStudioVersionRestoreSuccess'));
  assert.ok(calls.some(([name, message]) => name === 'alert' && /Rollback successfully restored!/.test(message)));
});

test('loadCurrentStudioVersionHistory passes live session getters when delegating to the version history loader', async () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const loadCurrentStudioVersionHistorySource = extractFunctionSource(
    fileContent,
    'async function loadCurrentStudioVersionHistory(',
    '\n\n    // Fetch versions checklist'
  );

  let capturedOptions = null;
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
  assert.equal(typeof capturedOptions.getCurrentPresentationUrl, 'function');
  assert.equal(typeof capturedOptions.getCurrentSessionToken, 'function');
  assert.equal(capturedOptions.getCurrentPresentationUrl(), '/presentations/onboarding-presentation/index.html');
  assert.equal(capturedOptions.getCurrentSessionToken(), 18);
  assert.deepEqual(context.renderVersionsListCalls, [[
    '/presentations/onboarding-presentation/index.html',
    versions
  ]]);

  context.currentPresentationUrl = '/presentations/ai-tools-presentation/index.html';
  context.studioEditorSessionToken = 19;
  assert.equal(capturedOptions.getCurrentPresentationUrl(), '/presentations/ai-tools-presentation/index.html');
  assert.equal(capturedOptions.getCurrentSessionToken(), 19);
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

test('handleCurrentStudioVersionListMutationSuccess delegates through the shared action handler options builder', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const versionActionContext = {
    presentationUrl: '/presentations/onboarding-presentation/index.html',
    sessionToken: 31
  };
  const isCurrentSession = () => true;
  const onSuccess = () => {};
  let capturedBuilderOptions = null;
  let delegatedArgs = null;
  const context = {
    SlideNextStudioEditorSession: editorSession,
    SlideNextStudioVersionActions: {
      ...versionActions,
      createStudioVersionActionHandlerOptions(options) {
        capturedBuilderOptions = options;
        return {
          marker: 'version-action-handler-options',
          ...options
        };
      },
      handleStudioVersionListMutationSuccess(nextVersionActionContext, handlerOptions) {
        delegatedArgs = {
          nextVersionActionContext,
          handlerOptions
        };
        return 'handled';
      }
    },
    currentPresentationUrl: '/presentations/onboarding-presentation/index.html',
    loadVersions() {},
    studioEditorSessionToken: 31
  };

  vm.createContext(context);
  loadHandleCurrentStudioVersionListMutationSuccess(fileContent, context);

  const result = context.handleCurrentStudioVersionListMutationSuccess(versionActionContext, {
    isCurrentSession,
    onSuccess
  });

  assert.equal(result, 'handled');
  assert.equal(delegatedArgs.nextVersionActionContext, versionActionContext);
  assert.equal(delegatedArgs.handlerOptions.marker, 'version-action-handler-options');
  assert.equal(typeof capturedBuilderOptions.getCurrentPresentationUrl, 'function');
  assert.equal(typeof capturedBuilderOptions.getCurrentSessionToken, 'function');
  assert.equal(capturedBuilderOptions.getCurrentPresentationUrl(), '/presentations/onboarding-presentation/index.html');
  assert.equal(capturedBuilderOptions.getCurrentSessionToken(), 31);
  assert.equal(capturedBuilderOptions.isCurrentSession, isCurrentSession);
  assert.equal(capturedBuilderOptions.onSuccess, onSuccess);
  assert.equal(capturedBuilderOptions.refreshVersionEntries, context.loadVersions);
  assert.equal(delegatedArgs.handlerOptions.isCurrentSession, isCurrentSession);
  assert.equal(delegatedArgs.handlerOptions.onSuccess, onSuccess);
  assert.equal(delegatedArgs.handlerOptions.refreshVersionEntries, context.loadVersions);
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
    currentPresentationUrl: '/presentations/onboarding-presentation/index.html',
    loadVersions(presentationUrl, sessionToken) {
      calls.push(['loadVersions', presentationUrl, sessionToken]);
    },
    studioEditorSessionToken: 9
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
    currentPresentationUrl: '/presentations/onboarding-presentation/index.html',
    loadVersions() {
      calls.push(['loadVersions']);
    },
    studioEditorSessionToken: 10
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
    },
    currentPresentationUrl: '/presentations/onboarding-presentation/index.html',
    studioEditorSessionToken: 11
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
    },
    currentPresentationUrl: '/presentations/onboarding-presentation/index.html',
    studioEditorSessionToken: 12
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

test('createCurrentStudioSessionStateOptions exposes live presentation and session getters', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  let capturedOptions = null;
  const context = {
    SlideNextStudioEditorSession: {
      ...editorSession,
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
