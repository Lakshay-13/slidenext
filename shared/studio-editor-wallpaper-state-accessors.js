(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorWallpaperStateAccessors = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function createStudioEditorWallpaperStateAccessors(options = {}) {
    const bridge = options.bridge || null;

    function read(methodName, fallback) {
      return bridge && typeof bridge[methodName] === 'function'
        ? bridge[methodName]()
        : fallback;
    }

    function write(methodName, value, fallback) {
      return bridge && typeof bridge[methodName] === 'function'
        ? bridge[methodName](value)
        : fallback;
    }

    return {
      bridge,
      getWallpaperTab: () => read('getWallpaperTab', 'solid'),
      setWallpaperTab: (nextValue) => write('setWallpaperTab', nextValue, false),
      setCustomGradientType: (nextValue) => write('setCustomGradientType', nextValue, false),
      getCustomGradientType: () => read('getCustomGradientType', 'linear'),
      reset: () => read('reset', false),
      getPendingCustomWallpaperVersion: () => read(
        'getPendingCustomWallpaperVersion',
        false
      ),
      setPendingCustomWallpaperVersion: (nextValue) => write(
        'setPendingCustomWallpaperVersion',
        nextValue,
        false
      ),
      clearPendingCustomWallpaperVersion: () => read(
        'clearPendingCustomWallpaperVersion',
        false
      )
    };
  }

  function createStudioEditorWallpaperStateGlobalApi(options = {}) {
    const accessors = options.accessors || createStudioEditorWallpaperStateAccessors(options);

    return {
      getStudioWallpaperTab: () => accessors.getWallpaperTab(),
      setStudioWallpaperTab: (nextValue) => accessors.setWallpaperTab(nextValue),
      setStudioCustomGradientType: (nextValue) => accessors.setCustomGradientType(nextValue),
      getStudioCustomGradientType: () => accessors.getCustomGradientType(),
      resetStudioWallpaperState: () => accessors.reset(),
      getStudioPendingCustomWallpaperVersion: () => accessors.getPendingCustomWallpaperVersion(),
      setStudioPendingCustomWallpaperVersion: (nextValue) => accessors
        .setPendingCustomWallpaperVersion(nextValue),
      clearStudioPendingCustomWallpaperVersion: () => accessors.clearPendingCustomWallpaperVersion()
    };
  }

  return {
    createStudioEditorWallpaperStateAccessors,
    createStudioEditorWallpaperStateGlobalApi
  };
});
