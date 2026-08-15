const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const renameModalController = require('../shared/studio-editor-version-rename-modal-controller.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

test('rename modal controller prepares state, input, button, and focus behavior', () => {
  const calls = [];
  const input = {
    value: '',
    focus() { calls.push('focus'); },
    select() { calls.push('select'); }
  };
  const elements = {
    newVersionNameInput: input,
    renameVersionModal: { id: 'modal' },
    renameVersionModalContent: { id: 'content' },
    confirmRenameVersionBtn: { id: 'button' }
  };
  const documentRef = {
    getElementById(id) {
      calls.push(['get', id]);
      return elements[id] || null;
    }
  };
  const controller = renameModalController.createStudioEditorVersionRenameModalController({
    documentRef,
    setRenameState(state) { calls.push(['state', state]); },
    createVersionActionContext() { return { presentationUrl: '/presentations/demo/index.html' }; },
    resetRenameButton(button) { calls.push(['reset', button]); },
    showModal(modal, content, options) {
      calls.push(['show', modal, content, options.delayMs]);
      options.onShown();
      return true;
    }
  });

  assert.equal(controller.open('version.html', 'Draft'), true);
  assert.deepEqual(calls.slice(0, 2), [
    ['state', {
      filename: 'version.html',
      context: { presentationUrl: '/presentations/demo/index.html' }
    }],
    ['get', 'newVersionNameInput']
  ]);
  assert.equal(input.value, 'Draft');
  assert.ok(calls.some((call) => Array.isArray(call) && call[0] === 'reset'));
  assert.ok(calls.some((call) => Array.isArray(call) && call[0] === 'show'));
  assert.deepEqual(calls.slice(-2), ['focus', 'select']);
});

test('rename modal controller clears state before hiding modal chrome', () => {
  const calls = [];
  const controller = renameModalController.createStudioEditorVersionRenameModalController({
    documentRef: { getElementById: (id) => ({ id }) },
    clearRenameState() { calls.push('clear'); },
    hideModal(modal, content) {
      calls.push(['hide', modal.id, content.id]);
      return true;
    }
  });

  assert.equal(controller.close(), true);
  assert.deepEqual(calls, ['clear', ['hide', 'renameVersionModal', 'renameVersionModalContent']]);
});

test('editor wires rename modal orchestration through a shared controller', () => {
  const source = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(source, /<script src="\/shared\/studio-editor-version-rename-modal-controller\.js"><\/script>/);
  assert.match(source, /studioEditorVersionRenameModalShellRuntimeApi/);
  assert.match(source, /createStudioEditorVersionRenameModalShellRuntime/);
  assert.match(source, /studioEditorVersionRenameModalController\.open\(filename, currentLabel\)/);
  assert.match(source, /studioEditorVersionRenameModalController\.close\(\)/);
  assert.doesNotMatch(source, /function promptRenameVersion\([^)]*\) \{[\s\S]*newVersionNameInput[\s\S]*showCurrentStudioVersionModal/);
});
