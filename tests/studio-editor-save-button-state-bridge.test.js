const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const bridgeApi = require('../shared/studio-editor-save-button-state-bridge.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');
const BRIDGE_PATH = path.join(
  __dirname,
  '..',
  'shared',
  'studio-editor-save-button-state-bridge.js'
);

test('save button state bridge delegates reads, writes, and resets', () => {
  const calls = [];
  const bridge = bridgeApi.createStudioEditorSaveButtonStateBridge({
    stateStore: {
      getState: () => 'saving-version',
      setState: (value) => {
        calls.push(['setState', value]);
        return value;
      },
      reset: () => {
        calls.push(['reset']);
        return 'idle';
      }
    }
  });

  assert.equal(bridge.getState(), 'saving-version');
  assert.equal(bridge.setState('idle'), 'idle');
  assert.equal(bridge.reset(), 'idle');
  assert.deepEqual(calls, [
    ['setState', 'idle'],
    ['reset']
  ]);
});

test('save button state bridge keeps safe defaults without a store', () => {
  const bridge = bridgeApi.createStudioEditorSaveButtonStateBridge({ stateStore: null });

  assert.equal(bridge.getState(), 'idle');
  assert.equal(bridge.setState('saving-version'), false);
  assert.equal(bridge.reset(), false);
});

test('editor loads and composes save button state through the bridge', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-save-button-state-bridge\.js"><\/script>/
  );
  assert.match(fileContent, /studioEditorSaveButtonStateBridge/);
  assert.match(fileContent, /studioEditorShellStateRuntime\.saveButtonStateBridge/);
  assert.doesNotMatch(
    fileContent,
    /studioEditorSaveButtonStateStore\s*\n\s*&&\s*typeof studioEditorSaveButtonStateStore\.(getState|setState)/
  );
});

test('save button state bridge publishes its browser global', () => {
  const context = { globalThis: {} };
  vm.runInNewContext(fs.readFileSync(BRIDGE_PATH, 'utf8'), context);

  assert.equal(typeof context.globalThis.SlideNextStudioEditorSaveButtonStateBridge, 'object');
  assert.equal(
    typeof context.globalThis.SlideNextStudioEditorSaveButtonStateBridge
      .createStudioEditorSaveButtonStateBridge,
    'function'
  );
});
