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
