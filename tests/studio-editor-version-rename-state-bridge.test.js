const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const bridgeApi = require('../shared/studio-editor-version-rename-state-bridge.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');
const BRIDGE_PATH = path.join(
  __dirname,
  '..',
  'shared',
  'studio-editor-version-rename-state-bridge.js'
);

test('version rename state bridge delegates reads, writes, and clears', () => {
  const calls = [];
  const bridge = bridgeApi.createStudioEditorVersionRenameStateBridge({
    stateStore: {
      getState: () => ({ filename: 'draft.html', context: { id: 'context-1' } }),
      setState: (value) => {
        calls.push(['setState', value]);
        return value;
      },
      clear: () => {
        calls.push(['clear']);
        return { filename: '', context: null };
      }
    }
  });

  assert.deepEqual(bridge.getState(), {
    filename: 'draft.html',
    context: { id: 'context-1' }
  });
  assert.deepEqual(bridge.setState({ filename: 'renamed.html', context: null }), {
    filename: 'renamed.html',
    context: null
  });
  assert.deepEqual(bridge.clear(), { filename: '', context: null });
  assert.deepEqual(calls, [
    ['setState', { filename: 'renamed.html', context: null }],
    ['clear']
  ]);
});

test('version rename state bridge keeps safe defaults without a store', () => {
  const bridge = bridgeApi.createStudioEditorVersionRenameStateBridge({ stateStore: null });

  assert.deepEqual(bridge.getState(), { filename: '', context: null });
  assert.equal(bridge.setState({ filename: 'ignored.html' }), false);
  assert.equal(bridge.clear(), false);
});

test('editor loads and composes version rename state through the bridge', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-version-rename-state-bridge\.js"><\/script>/
  );
  assert.match(fileContent, /studioEditorVersionRenameStateBridge/);
  assert.match(fileContent, /studioEditorShellStateRuntime\.versionRenameStateBridge/);
  assert.doesNotMatch(
    fileContent,
    /studioEditorVersionRenameStateStore\s*\n\s*&&\s*typeof studioEditorVersionRenameStateStore\.(getState|setState|clear)/
  );
});

test('version rename state bridge publishes its browser global', () => {
  const context = { globalThis: {} };
  vm.runInNewContext(fs.readFileSync(BRIDGE_PATH, 'utf8'), context);

  assert.equal(typeof context.globalThis.SlideNextStudioEditorVersionRenameStateBridge, 'object');
  assert.equal(
    typeof context.globalThis.SlideNextStudioEditorVersionRenameStateBridge
      .createStudioEditorVersionRenameStateBridge,
    'function'
  );
});
