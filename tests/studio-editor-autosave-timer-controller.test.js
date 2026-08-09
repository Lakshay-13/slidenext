const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');

const autoSaveTimer = require('../shared/studio-editor-autosave-timer-controller.js');

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
  assert.match(indexHtml, /createStudioEditorAutoSaveTimerController\(\{\}\)/);
  assert.match(indexHtml, /getStudioAutoSaveDebounceTimer\(\)/);
  assert.match(indexHtml, /setStudioAutoSaveDebounceTimer\(nextTimer\)/);
  assert.doesNotMatch(indexHtml, /let autoSaveDebounceTimer = null/);
});
