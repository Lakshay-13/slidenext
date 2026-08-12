const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const timerController = require('../shared/studio-editor-auto-version-timer-controller.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');
const TIMER_ACCESSORS_PATH = path.join(
  __dirname,
  '..',
  'shared',
  'studio-editor-timer-state-accessors.js'
);

test('auto-version timer controller owns keyed timers and clears one timer without affecting others', () => {
  const controller = timerController.createStudioEditorAutoVersionTimerController({
    initialTimers: { autosave: 11 }
  });

  assert.equal(controller.getTimer('autosave'), 11);
  assert.equal(controller.setTimer('version', 22), 22);
  assert.deepEqual(controller.getTimers(), { autosave: 11, version: 22 });
  assert.equal(controller.clearTimer('autosave'), 11);
  assert.deepEqual(controller.getTimers(), { version: 22 });
  assert.deepEqual(controller.clear(), {});
});

test('auto-version timer controller normalizes invalid timer maps and keys', () => {
  const controller = timerController.createStudioEditorAutoVersionTimerController({
    initialTimers: []
  });

  assert.deepEqual(controller.getTimers(), {});
  assert.equal(controller.setTimer('', 1), false);
  assert.equal(controller.getTimer(null), undefined);
  assert.equal(controller.clearTimer(null), undefined);
  assert.deepEqual(controller.setTimers(null), {});
});

test('editor routes auto-version timer ownership through the controller', () => {
  const source = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(source, /studio-editor-auto-version-timer-store\.js/);
  assert.match(source, /studioEditorTimerStateBridge/);
  assert.match(source, /studioEditorTimerStateGlobalApi/);
  assert.match(source, /Object\.assign\(globalThis, studioEditorTimerStateGlobalApi\)/);
  const timerAccessors = fs.readFileSync(TIMER_ACCESSORS_PATH, 'utf8');
  assert.match(timerAccessors, /getStudioAutoVersionTimers: \(\) => accessors\.getAutoVersionTimers\(\)/);
  assert.match(timerAccessors, /setStudioAutoVersionTimer: \(timerKey, timerId\) => accessors\.setAutoVersionTimer\(timerKey, timerId\)/);
  assert.match(timerAccessors, /clearStudioAutoVersionTimer: \(timerKey\) => accessors\.clearAutoVersionTimer\(timerKey\)/);
  assert.doesNotMatch(source, /const studioEditorAutoVersionTimerController =/);
  assert.doesNotMatch(source, /let autoVersionTimers = \{\}/);
  assert.doesNotMatch(source, /function getStudioAutoVersionTimers\(\)/);
});
