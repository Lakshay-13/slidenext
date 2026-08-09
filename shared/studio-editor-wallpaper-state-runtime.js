(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorWallpaperStateRuntime = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function createStudioEditorWallpaperStateRuntime(options = {}) {
    const stateStore = options.stateStore
      || (root && root.SlideNextStudioEditorWallpaperStateStore)
      || null;
    const wallpaperStateStore = stateStore
      && typeof stateStore.createStudioEditorWallpaperStateStore === 'function'
      ? stateStore.createStudioEditorWallpaperStateStore()
      : null;

    return {
      wallpaperStateStore
    };
  }

  return {
    createStudioEditorWallpaperStateRuntime
  };
});
