(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorWallpaperToolbarStateRuntimeAccessors = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function createStudioEditorWallpaperToolbarStateRuntimeAccessors(options = {}) {
    const runtimeApi = Object.prototype.hasOwnProperty.call(options, 'runtimeApi')
      ? options.runtimeApi
      : root && root.SlideNextStudioEditorWallpaperToolbarState;

    return {
      createStudioEditorWallpaperToolbarStateController(runtimeOptions = {}) {
        return runtimeApi
          && typeof runtimeApi.createStudioEditorWallpaperToolbarStateController === 'function'
          ? runtimeApi.createStudioEditorWallpaperToolbarStateController(runtimeOptions)
          : null;
      }
    };
  }

  return { createStudioEditorWallpaperToolbarStateRuntimeAccessors };
});
