const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const accessorsApi = require('../shared/studio-editor-timer-state-accessors.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');
const ACCESSORS_PATH = path.join(__dirname, '..', 'shared', 'studio-editor-timer-state-accessors.js');

test('timer state accessors delegate autosave and auto-version timers', () => {
  const bridge = {
    getAutoSaveDebounceTimer: () => 10,
    setAutoSaveDebounceTimer: (value) => value,
    getAutoVersionTimers: () => ({ deck: 20 }),
    setAutoVersionTimers: (value) => value,
    getAutoVersionTimer: (key) => `${key}-timer`,
    setAutoVersionTimer: (key, value) => `${key}:${value}`,
    clearAutoVersionTimer: (key) => `cleared:${key}`
  };
  const accessors = accessorsApi.createStudioEditorTimerStateAccessors({ bridge });

  assert.equal(accessors.getAutoSaveDebounceTimer(), 10);
  assert.equal(accessors.setAutoSaveDebounceTimer(11), 11);
  assert.deepEqual(accessors.getAutoVersionTimers(), { deck: 20 });
  assert.deepEqual(accessors.setAutoVersionTimers({ deck: 21 }), { deck: 21 });
  assert.equal(accessors.getAutoVersionTimer('deck'), 'deck-timer');
  assert.equal(accessors.setAutoVersionTimer('deck', 22), 'deck:22');
  assert.equal(accessors.clearAutoVersionTimer('deck'), 'cleared:deck');
});

test('timer state global api preserves the editor shell function names', () => {
  const accessors = {
    getAutoSaveDebounceTimer: () => 10,
    setAutoSaveDebounceTimer: (value) => value,
    getAutoVersionTimers: () => ({ deck: 20 }),
    setAutoVersionTimers: (value) => value,
    getAutoVersionTimer: (key) => `${key}-timer`,
    setAutoVersionTimer: (key, value) => `${key}:${value}`,
    clearAutoVersionTimer: (key) => `cleared:${key}`
  };
  const globalApi = accessorsApi.createStudioEditorTimerStateGlobalApi({ accessors });

  assert.equal(globalApi.getStudioAutoSaveDebounceTimer(), 10);
  assert.equal(globalApi.setStudioAutoSaveDebounceTimer(11), 11);
  assert.deepEqual(globalApi.getStudioAutoVersionTimers(), { deck: 20 });
  assert.deepEqual(globalApi.setStudioAutoVersionTimers({ deck: 21 }), { deck: 21 });
  assert.equal(globalApi.getStudioAutoVersionTimer('deck'), 'deck-timer');
  assert.equal(globalApi.setStudioAutoVersionTimer('deck', 22), 'deck:22');
  assert.equal(globalApi.clearStudioAutoVersionTimer('deck'), 'cleared:deck');
});

test('timer state accessors preserve safe fallbacks without a bridge', () => {
  const accessors = accessorsApi.createStudioEditorTimerStateAccessors();

  assert.equal(accessors.getAutoSaveDebounceTimer(), null);
  assert.equal(accessors.setAutoSaveDebounceTimer(null), false);
  assert.deepEqual(accessors.getAutoVersionTimers(), {});
  assert.equal(accessors.setAutoVersionTimers({}), false);
  assert.equal(accessors.getAutoVersionTimer('deck'), undefined);
  assert.equal(accessors.setAutoVersionTimer('deck', 1), false);
  assert.equal(accessors.clearAutoVersionTimer('deck'), undefined);
});

test('timer state accessors publish the global consumed by the editor shell', () => {
  const context = { globalThis: {} };
  vm.runInNewContext(fs.readFileSync(ACCESSORS_PATH, 'utf8'), context);

  assert.equal(typeof context.globalThis.SlideNextStudioEditorTimerStateAccessors, 'object');
  assert.equal(
    typeof context.globalThis.SlideNextStudioEditorTimerStateAccessors
      .createStudioEditorTimerStateAccessors,
    'function'
  );
  assert.equal(
    typeof context.globalThis.SlideNextStudioEditorTimerStateAccessors
      .createStudioEditorTimerStateGlobalApi,
    'function'
  );
});

test('editor loads timer accessors after the timer bridge', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-timer-state-accessors\.js"><\/script>/
  );
  assert.match(fileContent, /studioEditorShellStateRuntime\.timerStateAccessors/);
  assert.match(fileContent, /studioEditorTimerStateAccessors/);
  assert.match(fileContent, /Object\.assign\(globalThis, studioEditorTimerStateGlobalApi\)/);
  assert.doesNotMatch(fileContent, /function getStudioAutoSaveDebounceTimer\(\)/);
  assert.doesNotMatch(fileContent, /function getStudioAutoVersionTimers\(\)/);
});
