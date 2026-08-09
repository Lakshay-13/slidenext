(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorAutoSaveTimerStore = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function resolveController(options = {}) {
    if (options.stateController && typeof options.stateController === 'object') {
      return options.stateController;
    }

    const controllerApi = root && root.SlideNextStudioEditorAutoSaveTimerController;
    if (!controllerApi
      || typeof controllerApi.createStudioEditorAutoSaveTimerController !== 'function') {
      return null;
    }

    return controllerApi.createStudioEditorAutoSaveTimerController({
      initialTimer: options.initialTimer
    });
  }

  function createStudioEditorAutoSaveTimerStore(options = {}) {
    const controller = resolveController(options);

    function getTimer() {
      return controller && typeof controller.getTimer === 'function'
        ? controller.getTimer()
        : null;
    }

    function setTimer(nextTimer) {
      return controller && typeof controller.setTimer === 'function'
        ? controller.setTimer(nextTimer)
        : false;
    }

    return { getTimer, setTimer };
  }

  return { createStudioEditorAutoSaveTimerStore };
});
