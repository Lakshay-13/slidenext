const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const accessorsApi = require('../shared/studio-editor-save-button-state-accessors.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');
const ACCESSORS_PATH = path.join(__dirname, '..', 'shared', 'studio-editor-save-button-state-accessors.js');

test('save button state accessors delegate state reads and writes', () => {
  const bridge = {
    getState: () => 'saving-version',
    setState: (value) => value
  };
  const accessors = accessorsApi.createStudioEditorSaveButtonStateAccessors({ bridge });

  assert.equal(accessors.getState(), 'saving-version');
  assert.equal(accessors.setState('idle'), 'idle');
});

test('save button state accessors preserve the idle fallback without a bridge', () => {
  const accessors = accessorsApi.createStudioEditorSaveButtonStateAccessors();

  assert.equal(accessors.getState(), 'idle');
  assert.equal(accessors.setState('saving-version'), false);
});

test('save button global api preserves the editor shell getter name', () => {
  const globalApi = accessorsApi.createStudioEditorSaveButtonStateGlobalApi({
    accessors: {
      getState: () => 'saving-version'
    }
  });

  assert.equal(globalApi.getStudioSaveButtonState(), 'saving-version');
});

test('save button state accessors publish the global consumed by the editor shell', () => {
  const context = { globalThis: {} };
  vm.runInNewContext(fs.readFileSync(ACCESSORS_PATH, 'utf8'), context);

  assert.equal(
    typeof context.globalThis.SlideNextStudioEditorSaveButtonStateAccessors,
    'object'
  );
  assert.equal(
    typeof context.globalThis.SlideNextStudioEditorSaveButtonStateAccessors
      .createStudioEditorSaveButtonStateAccessors,
    'function'
  );
  assert.equal(
    typeof context.globalThis.SlideNextStudioEditorSaveButtonStateAccessors
      .createStudioEditorSaveButtonStateGlobalApi,
    'function'
  );
});

test('editor loads save button accessors after the save button bridge', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-save-button-state-accessors\.js"><\/script>/
  );
  assert.match(fileContent, /studioEditorShellStateRuntime\.saveButtonStateAccessors/);
  assert.match(fileContent, /studioEditorSaveButtonStateAccessors/);
  assert.match(fileContent, /Object\.assign\(globalThis, studioEditorSaveButtonStateGlobalApi\)/);
  assert.doesNotMatch(fileContent, /function getStudioSaveButtonState\(\)/);
});
