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
    'function resetStudioVersionUiState() {',
    '\n\n    function resetStudioSaveButtonState() {'
  );

  const elements = {
    versionsDropdown: {
      classList: createClassList()
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

  context.resetStudioVersionUiState();

  assert.equal(elements.versionsDropdown.classList.contains('hidden'), true);
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

  assert.equal(
    modalVisibility.getCurrentStudioModalVisibilityToken(elements.saveVersionModal),
    saveModalTokenBefore + 1
  );
  assert.equal(
    modalVisibility.getCurrentStudioModalVisibilityToken(elements.renameVersionModal),
    renameModalTokenBefore + 1
  );
});
