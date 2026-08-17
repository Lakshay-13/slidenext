const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const bridgeApi = require('../shared/studio-editor-timer-state-bridge.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

test('timer bridge composes autosave and auto-version runtimes', () => {
  const autoSaveStore = {
    getTimer: () => 10,
    setTimer: (value) => value
  };
  const autoVersionStore = {
    getTimers: () => ({ deck: 20 }),
    setTimers: (value) => value,
    getTimer: (key) => `${key}-timer`,
    setTimer: (key, value) => `${key}:${value}`,
    clearTimer: (key) => `cleared:${key}`
  };
  const autoSaveStateStore = { name: 'autosave-state-store' };
  const autoVersionStateStore = { name: 'auto-version-state-store' };
  const runtimeApi = {
    createStudioEditorAutoSaveTimerRuntime(options) {
      assert.equal(options.stateStore, autoSaveStateStore);
      return { autoSaveTimerStore: autoSaveStore };
    }
  };
  const autoVersionRuntimeApi = {
    createStudioEditorAutoVersionTimerRuntime(options) {
      assert.equal(options.stateStore, autoVersionStateStore);
      return { autoVersionTimerStore: autoVersionStore };
    }
  };

  const bridge = bridgeApi.createStudioEditorTimerStateBridge({
    autoSaveRuntimeApi: runtimeApi,
    autoSaveStateStore,
    autoVersionRuntimeApi,
    autoVersionStateStore
  });

  assert.equal(bridge.getAutoSaveDebounceTimer(), 10);
  assert.equal(bridge.setAutoSaveDebounceTimer(11), 11);
  assert.deepEqual(bridge.getAutoVersionTimers(), { deck: 20 });
  assert.deepEqual(bridge.setAutoVersionTimers({ deck: 21 }), { deck: 21 });
  assert.equal(bridge.getAutoVersionTimer('deck'), 'deck-timer');
  assert.equal(bridge.setAutoVersionTimer('deck', 22), 'deck:22');
  assert.equal(bridge.clearAutoVersionTimer('deck'), 'cleared:deck');
});

test('timer bridge preserves existing safe fallbacks without runtimes', () => {
  const bridge = bridgeApi.createStudioEditorTimerStateBridge({
    autoSaveRuntimeApi: null,
    autoVersionRuntimeApi: null
  });

  assert.equal(bridge.autoSaveRuntime, null);
  assert.equal(bridge.autoVersionRuntime, null);
  assert.equal(bridge.getAutoSaveDebounceTimer(), null);
  assert.equal(bridge.setAutoSaveDebounceTimer(null), false);
  assert.deepEqual(bridge.getAutoVersionTimers(), {});
  assert.equal(bridge.setAutoVersionTimers({}), false);
  assert.equal(bridge.getAutoVersionTimer('deck'), undefined);
  assert.equal(bridge.setAutoVersionTimer('deck', 1), false);
  assert.equal(bridge.clearAutoVersionTimer('deck'), undefined);
});

test('editor loads the timer bridge after both timer runtimes', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-timer-state-bridge\.js"><\/script>/
  );
  assert.match(
    fileContent,
    /createStudioEditorShellStateComposition\(/
  );
  assert.match(fileContent, /studioEditorTimerStateBridge/);
});
