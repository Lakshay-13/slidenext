(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorWallpaperStateStore = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function resolveController(options = {}) {
    if (options.stateController && typeof options.stateController === 'object') {
      return options.stateController;
    }

    const controllerApi = root && root.SlideNextStudioEditorWallpaperStateController;
    if (!controllerApi
      || typeof controllerApi.createStudioEditorWallpaperStateController !== 'function') {
      return null;
    }

    return controllerApi.createStudioEditorWallpaperStateController({
      initialWallpaperTab: options.initialWallpaperTab,
      initialCustomGradientType: options.initialCustomGradientType,
      initialPendingCustomWallpaperVersion: options.initialPendingCustomWallpaperVersion
    });
  }

  function createStudioEditorWallpaperStateStore(options = {}) {
    const controller = resolveController(options);

    function getWallpaperTab() {
      return controller && typeof controller.getWallpaperTab === 'function'
        ? controller.getWallpaperTab()
        : 'solid';
    }

    function setWallpaperTab(nextValue) {
      return controller && typeof controller.setWallpaperTab === 'function'
        ? controller.setWallpaperTab(nextValue)
        : false;
    }

    function getCustomGradientType() {
      return controller && typeof controller.getCustomGradientType === 'function'
        ? controller.getCustomGradientType()
        : 'linear';
    }

    function setCustomGradientType(nextValue) {
      return controller && typeof controller.setCustomGradientType === 'function'
        ? controller.setCustomGradientType(nextValue)
        : false;
    }

    function getPendingCustomWallpaperVersion() {
      return controller && typeof controller.getPendingCustomWallpaperVersion === 'function'
        ? controller.getPendingCustomWallpaperVersion()
        : false;
    }

    function setPendingCustomWallpaperVersion(nextValue) {
      return controller && typeof controller.setPendingCustomWallpaperVersion === 'function'
        ? controller.setPendingCustomWallpaperVersion(nextValue)
        : false;
    }

    function clearPendingCustomWallpaperVersion() {
      return controller && typeof controller.clearPendingCustomWallpaperVersion === 'function'
        ? controller.clearPendingCustomWallpaperVersion()
        : false;
    }

    function reset() {
      return controller && typeof controller.reset === 'function'
        ? controller.reset()
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

  return { createStudioEditorWallpaperStateStore };
});
