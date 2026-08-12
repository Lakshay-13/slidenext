const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const saveButtonState = require('../shared/studio-editor-save-button-state-controller.js');

const SAVE_BUTTON_ACCESSORS_PATH = path.join(
  __dirname,
  '..',
  'shared',
  'studio-editor-save-button-state-accessors.js'
);

test('save button state controller normalizes and resets version-save state', () => {
  const controller = saveButtonState.createStudioEditorSaveButtonStateController({
    initialState: 'saving-version'
  });

  assert.equal(controller.getState(), 'saving-version');
  assert.equal(controller.setState('unexpected'), 'idle');
  assert.equal(controller.setState('saving-version'), 'saving-version');
  assert.equal(controller.reset(), 'idle');
});

test('editor routes save button state through the shared controller', () => {
  const indexHtml = fs.readFileSync('index.html', 'utf8');

  assert.match(indexHtml, /studio-editor-save-button-state-controller\.js/);
  assert.match(indexHtml, /studio-editor-save-button-state-store\.js/);
  assert.match(indexHtml, /studioEditorSaveButtonStateStore/);
  assert.match(indexHtml, /studio-editor-save-button-state-accessors\.js/);
  assert.match(indexHtml, /studioEditorSaveButtonStateGlobalApi/);
  assert.match(indexHtml, /Object\.assign\(globalThis, studioEditorSaveButtonStateGlobalApi\)/);
  assert.match(
    fs.readFileSync(SAVE_BUTTON_ACCESSORS_PATH, 'utf8'),
    /getStudioSaveButtonState: \(\) => accessors\.getState\(\)/
  );
  assert.match(indexHtml, /studioEditorSaveButtonStateAccessors\.setState\(normalizedState\)/);
  assert.match(indexHtml, /getSaveButtonState: getStudioSaveButtonState/);
  assert.doesNotMatch(indexHtml, /function getStudioSaveButtonState\(\)/);
  assert.doesNotMatch(indexHtml, /const studioEditorSaveButtonStateController =/);
  assert.doesNotMatch(indexHtml, /let currentStudioSaveButtonState = 'idle'/);
});
