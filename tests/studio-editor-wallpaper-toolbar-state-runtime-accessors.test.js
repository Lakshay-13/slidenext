const test = require('node:test');
const assert = require('node:assert/strict');

const accessors = require('../shared/studio-editor-wallpaper-toolbar-state-runtime-accessors.js');

test('wallpaper toolbar runtime accessors create the shared controller', () => {
  const controller = { sync: () => true };
  const runtimeApi = {
    createStudioEditorWallpaperToolbarStateController(options) {
      assert.equal(options.id, 'wallpaper-toolbar');
      return controller;
    }
  };
  const runtime = accessors.createStudioEditorWallpaperToolbarStateRuntimeAccessors({ runtimeApi });

  assert.equal(
    runtime.createStudioEditorWallpaperToolbarStateController({ id: 'wallpaper-toolbar' }),
    controller
  );
});

test('wallpaper toolbar runtime accessors fail closed when runtime support is unavailable', () => {
  const runtime = accessors.createStudioEditorWallpaperToolbarStateRuntimeAccessors({ runtimeApi: null });
  assert.equal(runtime.createStudioEditorWallpaperToolbarStateController(), null);
});
