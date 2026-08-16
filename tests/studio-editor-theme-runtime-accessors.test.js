const test = require('node:test');
const assert = require('node:assert/strict');

const accessors = require('../shared/studio-editor-theme-runtime-accessors.js');

test('theme runtime accessors delegate shell construction and preserve runtime options', () => {
  let receivedOptions = null;
  const runtimeValue = { themeController: { name: 'theme' } };
  const runtimeApi = {
    createStudioEditorThemeShellRuntime(options) {
      receivedOptions = options;
      return runtimeValue;
    }
  };
  const themeRuntimeApi = { name: 'theme-runtime' };
  const runtimeOptions = {
    controllerApi: { name: 'controller' },
    resolveDarkMode: () => false
  };

  const result = accessors.createStudioEditorThemeRuntimeAccessors({
    runtimeApi,
    themeRuntimeApi,
    runtimeOptions
  });

  assert.deepEqual(result, { runtime: runtimeValue });
  assert.deepEqual(receivedOptions, {
    ...runtimeOptions,
    themeRuntimeApi
  });
});

test('theme runtime accessors fail closed without a shell factory', () => {
  assert.deepEqual(
    accessors.createStudioEditorThemeRuntimeAccessors({ runtimeApi: {} }),
    { runtime: null }
  );
  assert.deepEqual(
    accessors.createStudioEditorThemeRuntimeAccessors({ runtimeApi: null }),
    { runtime: null }
  );
});
