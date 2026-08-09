const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const timerController = require('../shared/studio-editor-history-timer-controller.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

test('history timer controller owns and clears the undo debounce timer', () => {
  const timer = { id: 'timer-1' };
  const controller = timerController.createStudioEditorHistoryTimerController({
    initialTimer: timer
  });

  assert.equal(controller.getTimer(), timer);
  assert.equal(controller.setTimer({ id: 'timer-2' }).id, 'timer-2');
  assert.equal(controller.clear(), null);
  assert.equal(controller.getTimer(), null);
});

test('editor wiring routes the undo debounce timer through the shared controller', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-history-timer-controller\.js"><\/script>/
  );
  assert.match(fileContent, /createStudioEditorHistoryTimerController\(\{/);
  assert.match(fileContent, /getTimer: getStudioUndoDebounceTimer/);
  assert.doesNotMatch(fileContent, /let undoDebounceTimer = null/);
});
