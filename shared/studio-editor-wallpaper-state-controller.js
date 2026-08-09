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

    function reset() {
      wallpaperTab = 'solid';
      customGradientType = 'linear';
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
      reset
    };
  }

  return { createStudioEditorWallpaperStateController };
});
