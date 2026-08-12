const test = require('node:test');
const assert = require('node:assert/strict');

const shellRuntime = require('../shared/studio-editor-auto-version-shell-runtime.js');

test('auto-version shell runtime delegates composition options', () => {
  let receivedOptions = null;
  const autoVersionRuntimeApi = {
    createStudioEditorAutoVersionRuntime(options) {
      receivedOptions = options;
      return { name: 'auto-version-runtime' };
    }
  };
  const controllerApi = { name: 'controller' };
  const execute = () => {};

  const result = shellRuntime.createStudioEditorAutoVersionShellRuntime({
    autoVersionRuntimeApi,
    controllerApi,
    execute
  });

  assert.deepEqual(result, { name: 'auto-version-runtime' });
  assert.equal(receivedOptions.controllerApi, controllerApi);
  assert.equal(receivedOptions.execute, execute);
  assert.equal(receivedOptions.autoVersionRuntimeApi, undefined);
});

test('auto-version shell runtime safely handles missing runtime factories', () => {
  assert.equal(shellRuntime.createStudioEditorAutoVersionShellRuntime({}), null);
  assert.equal(
    shellRuntime.createStudioEditorAutoVersionShellRuntime({
      autoVersionRuntimeApi: {}
    }),
    null
  );
});
