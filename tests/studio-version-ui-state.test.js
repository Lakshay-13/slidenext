const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const modalVisibility = require('../shared/studio-modal-visibility.js');

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
