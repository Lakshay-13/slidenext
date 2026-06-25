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
  const studioFrameEl = {
    contentDocument: null,
    contentWindow: {}
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
        case 'studioFrame':
          return studioFrameEl;
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
    currentPresentationUrl: '/presentations/onboarding-presentation/index.html',
    document: documentStub,
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
