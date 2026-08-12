const test = require('node:test');
const assert = require('node:assert/strict');

const shellRuntime = require('../shared/studio-editor-asset-shell-runtime.js');

test('asset shell runtime resolves controller and canonical dependencies', () => {
  let receivedOptions = null;
  const resultValue = { name: 'asset-runtime' };
  const assetRuntimeApi = {
    createStudioEditorAssetRuntime(options) {
      receivedOptions = options;
      return resultValue;
    }
  };
  const dependencies = {
    controllerApi: { name: 'controller' },
    canonicalDeckApi: { name: 'deck' },
    canonicalStateApi: { name: 'state' }
  };
  const callback = () => {};

  const result = shellRuntime.createStudioEditorAssetShellRuntime({
    assetRuntimeApi,
    ...dependencies,
    getCanonicalDeck: callback
  });

  assert.equal(result, resultValue);
  for (const [key, value] of Object.entries(dependencies)) {
    assert.equal(receivedOptions[key], value);
  }
  assert.equal(receivedOptions.getCanonicalDeck, callback);
  assert.equal(receivedOptions.assetRuntimeApi, undefined);
});

test('asset shell runtime honors explicitly unavailable dependencies', () => {
  let receivedOptions = null;
  const assetRuntimeApi = {
    createStudioEditorAssetRuntime(options) {
      receivedOptions = options;
      return {};
    }
  };

  shellRuntime.createStudioEditorAssetShellRuntime({
    assetRuntimeApi,
    controllerApi: null,
    canonicalDeckApi: null,
    canonicalStateApi: null
  });

  assert.equal(receivedOptions.controllerApi, null);
  assert.equal(receivedOptions.canonicalDeckApi, null);
  assert.equal(receivedOptions.canonicalStateApi, null);
});

test('asset shell runtime safely returns null without a runtime factory', () => {
  assert.equal(shellRuntime.createStudioEditorAssetShellRuntime({}), null);
  assert.equal(
    shellRuntime.createStudioEditorAssetShellRuntime({ assetRuntimeApi: {} }),
    null
  );
});
