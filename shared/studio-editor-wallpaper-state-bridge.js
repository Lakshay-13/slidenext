(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorWallpaperStateBridge = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function resolveStateStore(options = {}) {
    if (options.stateStore && typeof options.stateStore === 'object') {
      return options.stateStore;
    }
    const runtime = root && root.SlideNextStudioEditorWallpaperStateRuntime;
    return runtime && typeof runtime.createStudioEditorWallpaperStateRuntime === 'function'
      ? runtime.createStudioEditorWallpaperStateRuntime().wallpaperStateStore
      : null;
  }

  function createStudioEditorWallpaperStateBridge(options = {}) {
    const stateStore = resolveStateStore(options);

    function getWallpaperTab() {
      return stateStore && typeof stateStore.getWallpaperTab === 'function'
        ? stateStore.getWallpaperTab()
        : 'solid';
    }

    function setWallpaperTab(nextValue) {
      return stateStore && typeof stateStore.setWallpaperTab === 'function'
        ? stateStore.setWallpaperTab(nextValue)
        : false;
    }

    function getCustomGradientType() {
      return stateStore && typeof stateStore.getCustomGradientType === 'function'
        ? stateStore.getCustomGradientType()
        : 'linear';
    }

    function setCustomGradientType(nextValue) {
      return stateStore && typeof stateStore.setCustomGradientType === 'function'
        ? stateStore.setCustomGradientType(nextValue)
        : false;
    }

    function getPendingCustomWallpaperVersion() {
      return stateStore && typeof stateStore.getPendingCustomWallpaperVersion === 'function'
        ? stateStore.getPendingCustomWallpaperVersion()
        : false;
    }

    function setPendingCustomWallpaperVersion(nextValue) {
      return stateStore && typeof stateStore.setPendingCustomWallpaperVersion === 'function'
        ? stateStore.setPendingCustomWallpaperVersion(nextValue)
        : false;
    }

    function clearPendingCustomWallpaperVersion() {
      return stateStore && typeof stateStore.clearPendingCustomWallpaperVersion === 'function'
        ? stateStore.clearPendingCustomWallpaperVersion()
        : false;
    }

    function reset() {
      return stateStore && typeof stateStore.reset === 'function'
        ? stateStore.reset()
        : false;
    }

    return {
      getWallpaperTab,
      setWallpaperTab,
      getCustomGradientType,
      setCustomGradientType,
      getPendingCustomWallpaperVersion,
      setPendingCustomWallpaperVersion,
      clearPendingCustomWallpaperVersion,
      reset
    };
  }

  return { createStudioEditorWallpaperStateBridge };
});
