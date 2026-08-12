const test = require('node:test');
const assert = require('node:assert/strict');

const shellRuntime = require('../shared/studio-editor-source-shell-runtime.js');

test('source shell runtime resolves adapter dependencies and preserves callbacks', () => {
  let receivedOptions = null;
  const resultValue = { name: 'source-runtime' };
  const sourceRuntimeApi = {
    createStudioEditorSourceRuntime(options) {
      receivedOptions = options;
      return resultValue;
    }
  };
  const dependencies = {
    sourceControllerApi: { name: 'source-controller' },
    sourceAccessorsApi: { name: 'source-accessors' }
  };
  const callback = () => {};

  const result = shellRuntime.createStudioEditorSourceShellRuntime({
    sourceRuntimeApi,
    ...dependencies,
    buildSourceHtml: callback
  });

  assert.equal(result, resultValue);
  assert.equal(receivedOptions.sourceControllerApi, dependencies.sourceControllerApi);
  assert.equal(receivedOptions.sourceAccessorsApi, dependencies.sourceAccessorsApi);
  assert.equal(receivedOptions.buildSourceHtml, callback);
  assert.equal(receivedOptions.sourceRuntimeApi, undefined);
});

test('source shell runtime honors explicitly unavailable dependencies', () => {
  let receivedOptions = null;
  const sourceRuntimeApi = {
    createStudioEditorSourceRuntime(options) {
      receivedOptions = options;
      return {};
    }
  };

  shellRuntime.createStudioEditorSourceShellRuntime({
    sourceRuntimeApi,
    sourceControllerApi: null,
    sourceAccessorsApi: null
  });

  assert.equal(receivedOptions.sourceControllerApi, null);
  assert.equal(receivedOptions.sourceAccessorsApi, null);
});

test('source shell runtime safely returns null without a runtime factory', () => {
  assert.equal(shellRuntime.createStudioEditorSourceShellRuntime({}), null);
  assert.equal(
    shellRuntime.createStudioEditorSourceShellRuntime({ sourceRuntimeApi: {} }),
    null
  );
});
