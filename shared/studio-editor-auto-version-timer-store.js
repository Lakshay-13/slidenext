(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorAutoVersionTimerStore = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function resolveController(options = {}) {
    if (options.stateController && typeof options.stateController === 'object') {
      return options.stateController;
    }

    const controllerApi = root && root.SlideNextStudioEditorAutoVersionTimerController;
    if (!controllerApi
      || typeof controllerApi.createStudioEditorAutoVersionTimerController !== 'function') {
      return null;
    }

    return controllerApi.createStudioEditorAutoVersionTimerController({
      initialTimers: options.initialTimers
    });
  }

  function createStudioEditorAutoVersionTimerStore(options = {}) {
    const controller = resolveController(options);

    function getTimers() {
      return controller && typeof controller.getTimers === 'function'
        ? controller.getTimers()
        : {};
    }

    function setTimers(nextTimers) {
      return controller && typeof controller.setTimers === 'function'
        ? controller.setTimers(nextTimers)
        : false;
    }

    function getTimer(timerKey) {
      return controller && typeof controller.getTimer === 'function'
        ? controller.getTimer(timerKey)
        : undefined;
    }

    function setTimer(timerKey, timerId) {
      return controller && typeof controller.setTimer === 'function'
        ? controller.setTimer(timerKey, timerId)
        : false;
    }

    function clearTimer(timerKey) {
      return controller && typeof controller.clearTimer === 'function'
        ? controller.clearTimer(timerKey)
        : undefined;
    }

    return { getTimers, setTimers, getTimer, setTimer, clearTimer };
  }

  return { createStudioEditorAutoVersionTimerStore };
});
