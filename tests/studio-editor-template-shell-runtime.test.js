const test = require('node:test');
const assert = require('node:assert/strict');

const shellRuntime = require('../shared/studio-editor-template-shell-runtime.js');

test('template shell runtime resolves controller, canonical, and render dependencies', () => {
  let receivedOptions = null;
  const resultValue = { name: 'template-runtime' };
  const templateRuntimeApi = {
    createStudioEditorTemplateRuntime(options) {
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

  const result = shellRuntime.createStudioEditorTemplateShellRuntime({
    templateRuntimeApi,
    ...dependencies,
    getCanonicalDeck: callback
  });

  assert.equal(result, resultValue);
  for (const [key, value] of Object.entries(dependencies)) {
    assert.equal(receivedOptions[key], value);
  }
  assert.equal(receivedOptions.getCanonicalDeck, callback);
  assert.equal(receivedOptions.templateRuntimeApi, undefined);
});

test('template shell runtime honors explicitly unavailable dependencies', () => {
  let receivedOptions = null;
  const templateRuntimeApi = {
    createStudioEditorTemplateRuntime(options) {
      receivedOptions = options;
      return {};
    }
  };

  shellRuntime.createStudioEditorTemplateShellRuntime({
    templateRuntimeApi,
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

test('template shell runtime safely returns null without a runtime factory', () => {
  assert.equal(shellRuntime.createStudioEditorTemplateShellRuntime({}), null);
  assert.equal(
    shellRuntime.createStudioEditorTemplateShellRuntime({ templateRuntimeApi: {} }),
    null
  );
});
