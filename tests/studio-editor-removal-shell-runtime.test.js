const test = require('node:test');
const assert = require('node:assert/strict');

const shellRuntime = require('../shared/studio-editor-removal-shell-runtime.js');

test('removal shell runtime resolves controller and canonical dependencies', () => {
  let receivedOptions = null;
  const resultValue = { name: 'removal-runtime' };
  const removalRuntimeApi = {
    createStudioEditorRemovalRuntime(options) {
      receivedOptions = options;
      return resultValue;
    }
  };
  const dependencies = {
    controllerApi: { name: 'controller' },
    canonicalDeckApi: { name: 'deck' },
    canonicalRemovalApi: { name: 'removal' }
  };
  const callback = () => {};

  const result = shellRuntime.createStudioEditorRemovalShellRuntime({
    removalRuntimeApi,
    ...dependencies,
    getIframeDoc: callback
  });

  assert.equal(result, resultValue);
  for (const [key, value] of Object.entries(dependencies)) {
    assert.equal(receivedOptions[key], value);
  }
  assert.equal(receivedOptions.getIframeDoc, callback);
  assert.equal(receivedOptions.removalRuntimeApi, undefined);
});

test('removal shell runtime honors explicitly unavailable dependencies', () => {
  let receivedOptions = null;
  const removalRuntimeApi = {
    createStudioEditorRemovalRuntime(options) {
      receivedOptions = options;
      return {};
    }
  };

  shellRuntime.createStudioEditorRemovalShellRuntime({
    removalRuntimeApi,
    controllerApi: null,
    canonicalDeckApi: null,
    canonicalRemovalApi: null
  });

  assert.equal(receivedOptions.controllerApi, null);
  assert.equal(receivedOptions.canonicalDeckApi, null);
  assert.equal(receivedOptions.canonicalRemovalApi, null);
});

test('removal shell runtime safely returns null without a runtime factory', () => {
  assert.equal(shellRuntime.createStudioEditorRemovalShellRuntime({}), null);
  assert.equal(
    shellRuntime.createStudioEditorRemovalShellRuntime({ removalRuntimeApi: {} }),
    null
  );
});
