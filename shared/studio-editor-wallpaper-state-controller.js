(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorWallpaperStateController = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function createStudioEditorWallpaperStateController(options = {}) {
    let wallpaperTab = typeof options.initialWallpaperTab === 'string'
      ? options.initialWallpaperTab
      : 'solid';
    let customGradientType = typeof options.initialCustomGradientType === 'string'
      ? options.initialCustomGradientType
      : 'linear';
    let pendingCustomWallpaperVersion = !!options.initialPendingCustomWallpaperVersion;

    function reset() {
      wallpaperTab = 'solid';
      customGradientType = 'linear';
      pendingCustomWallpaperVersion = false;
      return {
        wallpaperTab,
        customGradientType
      };
    }

    return {
      getWallpaperTab: () => wallpaperTab,
      setWallpaperTab: (nextValue) => {
        wallpaperTab = nextValue;
        return wallpaperTab;
      },
      getCustomGradientType: () => customGradientType,
      setCustomGradientType: (nextValue) => {
        customGradientType = nextValue;
        return customGradientType;
      },
      getPendingCustomWallpaperVersion: () => pendingCustomWallpaperVersion,
      setPendingCustomWallpaperVersion: (nextValue) => {
        pendingCustomWallpaperVersion = !!nextValue;
        return pendingCustomWallpaperVersion;
      },
      clearPendingCustomWallpaperVersion: () => {
        pendingCustomWallpaperVersion = false;
        return pendingCustomWallpaperVersion;
      },
      reset
    };
  }

  return { createStudioEditorWallpaperStateController };
});
