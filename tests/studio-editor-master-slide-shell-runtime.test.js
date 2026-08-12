const test = require('node:test');
const assert = require('node:assert/strict');

const shellRuntime = require('../shared/studio-editor-master-slide-shell-runtime.js');

test('master-slide shell runtime resolves controller, canonical, and render dependencies', () => {
  let receivedOptions = null;
  const resultValue = { name: 'master-slide-runtime' };
  const masterSlideRuntimeApi = {
    createStudioEditorMasterSlideRuntime(options) {
      receivedOptions = options;
      return resultValue;
    }
  };
  const dependencies = {
    controllerApi: { name: 'controller' },
    canonicalDeckApi: { name: 'deck' },
    canonicalStateApi: { name: 'state' },
    renderApi: { name: 'render' }
  };
  const callback = () => {};

  const result = shellRuntime.createStudioEditorMasterSlideShellRuntime({
    masterSlideRuntimeApi,
    ...dependencies,
    getCanonicalDeck: callback
  });

  assert.equal(result, resultValue);
  for (const [key, value] of Object.entries(dependencies)) {
    assert.equal(receivedOptions[key], value);
  }
  assert.equal(receivedOptions.getCanonicalDeck, callback);
  assert.equal(receivedOptions.masterSlideRuntimeApi, undefined);
});

test('master-slide shell runtime honors explicitly unavailable dependencies', () => {
  let receivedOptions = null;
  const masterSlideRuntimeApi = {
    createStudioEditorMasterSlideRuntime(options) {
      receivedOptions = options;
      return {};
    }
  };

  shellRuntime.createStudioEditorMasterSlideShellRuntime({
    masterSlideRuntimeApi,
    controllerApi: null,
    canonicalDeckApi: null,
    canonicalStateApi: null,
    renderApi: null
  });

  assert.equal(receivedOptions.controllerApi, null);
  assert.equal(receivedOptions.canonicalDeckApi, null);
  assert.equal(receivedOptions.canonicalStateApi, null);
  assert.equal(receivedOptions.renderApi, null);
});

test('master-slide shell runtime safely returns null without a runtime factory', () => {
  assert.equal(shellRuntime.createStudioEditorMasterSlideShellRuntime({}), null);
  assert.equal(
    shellRuntime.createStudioEditorMasterSlideShellRuntime({ masterSlideRuntimeApi: {} }),
    null
  );
});
