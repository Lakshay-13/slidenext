const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const autoSaveTimer = require('../shared/studio-editor-autosave-timer-controller.js');

const TIMER_ACCESSORS_PATH = path.join(
  __dirname,
  '..',
  'shared',
  'studio-editor-timer-state-accessors.js'
);

test('autosave timer controller owns and clears the debounce handle', () => {
  const controller = autoSaveTimer.createStudioEditorAutoSaveTimerController({
    initialTimer: 42
  });

  assert.equal(controller.getTimer(), 42);
  assert.equal(controller.setTimer(84), 84);
  assert.equal(controller.clear(), null);
  assert.equal(controller.getTimer(), null);
});

test('editor routes autosave timer access through the shared controller', () => {
  const indexHtml = fs.readFileSync('index.html', 'utf8');

  assert.match(indexHtml, /studio-editor-autosave-timer-controller\.js/);
  assert.match(indexHtml, /studio-editor-autosave-timer-store\.js/);
  assert.match(indexHtml, /studioEditorTimerStateBridge/);
  assert.match(indexHtml, /studioEditorTimerStateGlobalApi/);
  assert.match(indexHtml, /Object\.assign\(globalThis, studioEditorTimerStateGlobalApi\)/);
  const timerAccessors = fs.readFileSync(TIMER_ACCESSORS_PATH, 'utf8');
  assert.match(timerAccessors, /getStudioAutoSaveDebounceTimer: \(\) => accessors\.getAutoSaveDebounceTimer\(\)/);
  assert.match(timerAccessors, /setStudioAutoSaveDebounceTimer: \(nextTimer\) => accessors\.setAutoSaveDebounceTimer\(nextTimer\)/);
  assert.doesNotMatch(indexHtml, /const studioEditorAutoSaveTimerController =/);
  assert.doesNotMatch(indexHtml, /let autoSaveDebounceTimer = null/);
  assert.doesNotMatch(indexHtml, /function getStudioAutoSaveDebounceTimer\(\)/);
});
