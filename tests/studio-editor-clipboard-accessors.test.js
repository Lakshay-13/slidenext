const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const accessorsApi = require('../shared/studio-editor-clipboard-accessors.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');
const ACCESSORS_PATH = path.join(__dirname, '..', 'shared', 'studio-editor-clipboard-accessors.js');

test('clipboard accessors delegate reads to the controller', () => {
  const clipboard = { items: [{ id: 'item-1' }], pasteCount: 0 };
  const accessors = accessorsApi.createStudioEditorClipboardAccessors({
    controller: { getClipboard: () => clipboard },
    getFallbackClipboard: () => ({ items: [] })
  });

  assert.equal(accessors.getClipboard(), clipboard);
});

test('clipboard accessors preserve the legacy fallback without a controller', () => {
  const clipboard = { items: [{ id: 'fallback-item' }], pasteCount: 1 };
  const accessors = accessorsApi.createStudioEditorClipboardAccessors({
    getFallbackClipboard: () => clipboard
  });

  assert.equal(accessors.getClipboard(), clipboard);
});

test('clipboard accessors bind copy and paste controls to editor commands', () => {
  const controlIds = ['copySelectionBtn', 'pasteClipboardBtn', 'slidePasteClipboardBtn'];
  const controls = Object.fromEntries(controlIds.map((id) => [id, {
    listeners: {},
    addEventListener(type, handler) {
      this.listeners[type] = handler;
    }
  }]));
  const calls = [];
  const accessors = accessorsApi.createStudioEditorClipboardAccessors({
    copySelectedElements: () => calls.push('copy'),
    pasteClipboardElements: () => calls.push('paste')
  });
  const documentRef = {
    getElementById(id) {
      return controls[id] || null;
    }
  };

  assert.deepEqual(
    accessors.bindStudioEditorClipboardControls({ documentRef }),
    Object.fromEntries(controlIds.map((id) => [id, true]))
  );
  controlIds.forEach((id) => controls[id].listeners.click());
  assert.deepEqual(calls, ['copy', 'paste', 'paste']);
});

test('clipboard global api preserves the editor shell getter name', () => {
  const clipboard = { items: [{ id: 'item-1' }], pasteCount: 0 };
  const globalApi = accessorsApi.createStudioEditorClipboardGlobalApi({
    accessors: { getClipboard: () => clipboard }
  });

  assert.equal(globalApi.getStudioEditorClipboard(), clipboard);
});

test('clipboard accessors publish the global consumed by the editor shell', () => {
  const context = { globalThis: {} };
  vm.runInNewContext(fs.readFileSync(ACCESSORS_PATH, 'utf8'), context);

  assert.equal(typeof context.globalThis.SlideNextStudioEditorClipboardAccessors, 'object');
  assert.equal(
    typeof context.globalThis.SlideNextStudioEditorClipboardAccessors
      .createStudioEditorClipboardAccessors,
    'function'
  );
  assert.equal(
    typeof context.globalThis.SlideNextStudioEditorClipboardAccessors
      .createStudioEditorClipboardGlobalApi,
    'function'
  );
});

test('editor loads clipboard accessors and publishes the legacy getter', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-clipboard-accessors\.js"><\/script>/
  );
  assert.match(fileContent, /studioEditorClipboardAccessorsApi/);
  assert.match(fileContent, /studioEditorClipboardGlobalApi/);
  assert.match(fileContent, /Object\.assign\(globalThis, studioEditorClipboardGlobalApi\)/);
  ['copySelectionBtn', 'pasteClipboardBtn', 'slidePasteClipboardBtn'].forEach((id) => {
    const line = fileContent.split('\n').find((candidate) => candidate.includes(`id="${id}"`));
    assert.ok(line, `Missing clipboard control: ${id}`);
    assert.doesNotMatch(line, /onclick=/);
  });
  assert.match(fileContent, /bindStudioEditorClipboardControls\(\{ documentRef: document \}\)/);
  assert.doesNotMatch(fileContent, /function getStudioEditorClipboard\(\)/);
});
