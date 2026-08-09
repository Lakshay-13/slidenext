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
    ['exported-with-warnings', 'PPTX Exported with warnings'],
    ['exporting-pdf', 'Exporting PDF'],
    ['pdf-export-failed', 'PDF Export Failed'],
    ['pdf-exported', 'PDF Export Ready'],
    ['pdf-exported-with-warnings', 'PDF Export Ready with warnings'],
    ['saved', 'Saved to disk']
  ]) {
    assert.equal(statusView.setStudioAutoSaveStatus({ documentRef, state }), true);
    assert.match(statusEl.innerHTML, new RegExp(expectedText));
  }
});

test('setStudioAutoSaveStatus safely skips missing status chrome', () => {
  assert.equal(statusView.setStudioAutoSaveStatus({ documentRef: { getElementById() { return null; } } }), false);
});

test('setStudioAutoSaveStatus renders PDF resource progress', () => {
  const statusEl = { innerHTML: '', title: '' };
  const documentRef = {
    getElementById(id) {
      return id === 'autoSaveStatus' ? statusEl : null;
    }
  };

  assert.equal(statusView.setStudioAutoSaveStatus({
    documentRef,
    state: 'exporting-pdf',
    progressPercent: 42
  }), true);
  assert.match(statusEl.innerHTML, /Exporting PDF 42%/);
});

test('setStudioAutoSaveStatus surfaces the PPTX warning count when provided', () => {
  const statusEl = { innerHTML: '' };
  const documentRef = {
    getElementById(id) {
      return id === 'autoSaveStatus' ? statusEl : null;
    }
  };

  assert.equal(statusView.setStudioAutoSaveStatus({
    documentRef,
    state: 'exported-with-warnings',
    warningCount: 3,
    warnings: ['Node image-1 references a missing image asset'],
    warningsTruncated: true
  }), true);
  assert.match(statusEl.innerHTML, /PPTX Exported with warnings \(3\)/);
  assert.match(statusEl.title, /Node image-1 references a missing image asset/);
  assert.match(statusEl.title, /Additional warnings not shown/);
});

test('setStudioAutoSaveStatus surfaces PDF preflight warnings separately from PPTX warnings', () => {
  const statusEl = { innerHTML: '', title: '' };
  const documentRef = {
    getElementById(id) {
      return id === 'autoSaveStatus' ? statusEl : null;
    }
  };

  assert.equal(statusView.setStudioAutoSaveStatus({
    documentRef,
    state: 'pdf-exported-with-warnings',
    warningCount: 1,
    warnings: ['PDF node image-1 references missing asset "hero"']
  }), true);
  assert.match(statusEl.innerHTML, /PDF Export Ready with warnings \(1\)/);
  assert.match(statusEl.title, /PDF warnings/);
  assert.match(statusEl.title, /missing asset/);
});

test('setStudioAutoSaveStatusWithWarningCount normalizes warnings and PDF progress', () => {
  const statusEl = { innerHTML: '', title: '' };
  const documentRef = {
    getElementById(id) {
      return id === 'autoSaveStatus' ? statusEl : null;
    }
  };

  assert.equal(statusView.setStudioAutoSaveStatusWithWarningCount({
    documentRef,
    state: 'exported-with-warnings',
    warningCount: 2,
    warnings: ['Missing asset'],
    warningsTruncated: false
  }), true);
  assert.match(statusEl.innerHTML, /PPTX Exported with warnings \(2\)/);
  assert.match(statusEl.title, /Missing asset/);

  assert.equal(statusView.setStudioAutoSaveStatusWithWarningCount({
    documentRef,
    state: 'exporting-pdf',
    warningCount: { percent: 60 }
  }), true);
  assert.match(statusEl.innerHTML, /Exporting PDF 60%/);
});

test('createStudioAutoSaveStatusSync resolves the document and progress through callbacks', () => {
  const documentRef = { id: 'editor-shell' };
  const calls = [];
  const syncStatus = statusView.createStudioAutoSaveStatusSync({
    getDocument() {
      calls.push('document');
      return documentRef;
    },
    setStatus(options) {
      calls.push(options);
      return true;
    }
  });

  assert.equal(syncStatus('exporting-pdf', { percent: 42 }), true);
  assert.deepEqual(calls, [
    'document',
    {
      documentRef,
      state: 'exporting-pdf',
      progressPercent: 42
    }
  ]);
});

test('createStudioAutoSaveStatusWithWarningCountSync fails closed when status rendering throws', () => {
  const syncStatus = statusView.createStudioAutoSaveStatusWithWarningCountSync({
    setStatus() {
      throw new Error('status unavailable');
    }
  });

  assert.equal(syncStatus('exported-with-warnings', 2, ['Missing asset'], true), false);
});

test('createStudioSaveButtonStateSync resolves the document through callbacks', () => {
  const documentRef = { id: 'editor-shell' };
  const calls = [];
  const syncState = statusView.createStudioSaveButtonStateSync({
    getDocument() {
      calls.push('document');
      return documentRef;
    },
    setState(options) {
      calls.push(options);
      return true;
    }
  });

  assert.equal(syncState('saving-version'), true);
  assert.deepEqual(calls, [
    'document',
    { documentRef, state: 'saving-version' }
  ]);
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
