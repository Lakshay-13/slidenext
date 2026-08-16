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

test('theme shell runtime accepts flattened options from the runtime accessors', () => {
  let receivedOptions = null;
  const runtimeOptions = {
    documentRef: { name: 'editor-document' },
    getIframeDocument: () => null
  };
  const themeRuntimeApi = {
    createStudioEditorThemeRuntime(options) {
      receivedOptions = options;
      return { name: 'theme-runtime' };
    }
  };

  assert.deepEqual(
    shellRuntime.createStudioEditorThemeShellRuntime({
      themeRuntimeApi,
      ...runtimeOptions
    }),
    { name: 'theme-runtime' }
  );
  assert.deepEqual(receivedOptions, {
    documentRef: runtimeOptions.documentRef,
    getIframeDocument: runtimeOptions.getIframeDocument,
    themeRuntimeApi
  });
});

test('theme shell runtime safely handles missing runtime factories', () => {
  assert.equal(shellRuntime.createStudioEditorThemeShellRuntime({}), null);
  assert.equal(
    shellRuntime.createStudioEditorThemeShellRuntime({ themeRuntimeApi: {} }),
    null
  );
});
