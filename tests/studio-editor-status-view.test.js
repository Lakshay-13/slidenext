const test = require('node:test');
const assert = require('node:assert/strict');

const statusView = require('../shared/studio-editor-status-view.js');

test('setStudioAutoSaveStatus renders loading, export, failure, and saved states', () => {
  const statusEl = { innerHTML: '' };
  const documentRef = {
    getElementById(id) {
      return id === 'autoSaveStatus' ? statusEl : null;
    }
  };

  for (const [state, expectedText] of [
    ['loading', 'Loading deck'],
    ['saving', 'Saving'],
    ['autosave-failed', 'AutoSave Failed'],
    ['save-version-failed', 'Save Version Failed'],
    ['network-error', 'Network Error'],
    ['exporting', 'Exporting PPTX'],
    ['export-failed', 'PPTX Export Failed'],
    ['exported', 'PPTX Exported'],
    ['saved', 'Saved to disk']
  ]) {
    assert.equal(statusView.setStudioAutoSaveStatus({ documentRef, state }), true);
    assert.match(statusEl.innerHTML, new RegExp(expectedText));
  }
});

test('setStudioAutoSaveStatus safely skips missing status chrome', () => {
  assert.equal(statusView.setStudioAutoSaveStatus({ documentRef: { getElementById() { return null; } } }), false);
});

test('setStudioSaveButtonState renders saving and idle version states', () => {
  const saveBtn = { disabled: false, innerHTML: '<span>Save Version</span>' };
  const documentRef = {
    getElementById(id) {
      return id === 'studioSaveBtn' ? saveBtn : null;
    }
  };

  assert.equal(statusView.setStudioSaveButtonState({ documentRef, state: 'saving-version' }), true);
  assert.equal(saveBtn.disabled, true);
  assert.match(saveBtn.innerHTML, /Creating version/);

  assert.equal(statusView.setStudioSaveButtonState({ documentRef, state: 'idle' }), true);
  assert.equal(saveBtn.disabled, false);
  assert.match(saveBtn.innerHTML, /Save Version/);
});
