const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

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
  const context = {
    SlideNextStudioEditorSession: {
      createStudioFrameLoadHandler() {
        return function onloadHandler() {};
      }
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
    resetEditorDeckPersistenceState() {},
    resetEditorHistoryState() {},
    resetEditorPersistenceTimers() {},
    resetStudioDeckUiState() {},
    resetStudioPresentationUiState() {},
    resetStudioSaveButtonState() {},
    resetStudioSourceViewUiState() {},
    resetStudioVersionUiState() {},
    setTimeout,
    studioEditorSessionToken: 0,
    updateDeckReadyToolbarActionState() {}
  };

  vm.createContext(context);
  vm.runInContext(setStudioAutoSaveStatusSource, context);
  vm.runInContext(launchStudioEditorSource, context);

  context.launchStudioEditor('/presentations/onboarding-presentation/index.html', 'Project Onboarding', 'General');

  assert.match(elements.autoSaveStatus.innerHTML, /Loading deck/);
  assert.equal(elements.studioCategoryLabel.textContent, 'General');
  assert.equal(elements.studioTitleLabel.textContent, 'Project Onboarding');
  assert.equal(elements.studioFrame.src, '/presentations/onboarding-presentation/index.html');
  assert.equal(elements.studioEditor.classList.contains('active'), true);
  assert.deepEqual(loadVersionsCalls, [[
    '/presentations/onboarding-presentation/index.html',
    1
  ]]);
});
