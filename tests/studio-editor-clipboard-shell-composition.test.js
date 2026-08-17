const test = require('node:test');
const assert = require('node:assert/strict');

const composition = require('../shared/studio-editor-clipboard-shell-composition.js');

test('clipboard shell composition resolves dependencies and exposes the controller', () => {
  let receivedOptions = null;
  const controller = { copy() {}, paste() {} };
  const runtime = { clipboardController: controller };
  const accessorsApi = {
    createStudioEditorClipboardRuntimeAccessors(options) {
      receivedOptions = options;
      return { runtime };
    }
  };
  const runtimeApi = { name: 'shell-runtime' };
  const clipboardRuntimeApi = { name: 'runtime' };
  const dependencies = {
    controllerApi: { name: 'controller-api' },
    clipboardApi: { name: 'clipboard' },
    canonicalDeckApi: { name: 'canonical-deck' },
    canonicalInsertionApi: { name: 'canonical-insertion' },
    deckImportApi: { name: 'deck-import' }
  };
  const getIframeDoc = () => null;

  const result = composition.createStudioEditorClipboardShellComposition({
    accessorsApi,
    runtimeApi,
    clipboardRuntimeApi,
    ...dependencies,
    runtimeOptions: { getIframeDoc }
  });

  assert.equal(result.accessors.runtime, runtime);
  assert.equal(result.runtime, runtime);
  assert.equal(result.controller, controller);
  assert.equal(receivedOptions.runtimeApi, runtimeApi);
  assert.equal(receivedOptions.clipboardRuntimeApi, clipboardRuntimeApi);
  assert.equal(receivedOptions.runtimeOptions.getIframeDoc, getIframeDoc);
  for (const [key, value] of Object.entries(dependencies)) {
    assert.equal(receivedOptions.runtimeOptions[key], value);
  }
});

test('clipboard shell composition fails closed when accessors are unavailable', () => {
  assert.deepEqual(
    composition.createStudioEditorClipboardShellComposition({ accessorsApi: null }),
    { accessors: null, runtime: null, controller: null }
  );
});
