const test = require('node:test');
const assert = require('node:assert/strict');

const shellRuntime = require('../shared/studio-editor-theme-shell-runtime.js');

test('theme shell runtime delegates the prepared theme options', () => {
  let receivedOptions = null;
  const runtimeOptions = { resolveDarkMode: () => false };
  const themeRuntimeApi = {
    createStudioEditorThemeRuntime(options) {
      receivedOptions = options;
      return { name: 'theme-runtime' };
    }
  };

  assert.deepEqual(
    shellRuntime.createStudioEditorThemeShellRuntime({
      themeRuntimeApi,
      runtimeOptions
    }),
    { name: 'theme-runtime' }
  );
  assert.equal(receivedOptions, runtimeOptions);
});

test('theme shell runtime safely handles missing runtime factories', () => {
  assert.equal(shellRuntime.createStudioEditorThemeShellRuntime({}), null);
  assert.equal(
    shellRuntime.createStudioEditorThemeShellRuntime({ themeRuntimeApi: {} }),
    null
  );
});
