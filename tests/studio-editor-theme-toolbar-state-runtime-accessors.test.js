const test = require('node:test');
const assert = require('node:assert/strict');

const accessors = require('../shared/studio-editor-theme-toolbar-state-runtime-accessors.js');

test('theme toolbar runtime accessors create the shared controller', () => {
  const controller = { sync: () => true };
  const runtimeApi = {
    createStudioEditorThemeToolbarStateController(options) {
      assert.equal(options.id, 'theme-toolbar');
      return controller;
    }
  };
  const runtime = accessors.createStudioEditorThemeToolbarStateRuntimeAccessors({ runtimeApi });

  assert.equal(
    runtime.createStudioEditorThemeToolbarStateController({ id: 'theme-toolbar' }),
    controller
  );
});

test('theme toolbar runtime accessors fail closed when runtime support is unavailable', () => {
  const runtime = accessors.createStudioEditorThemeToolbarStateRuntimeAccessors({ runtimeApi: null });
  assert.equal(runtime.createStudioEditorThemeToolbarStateController(), null);
});
