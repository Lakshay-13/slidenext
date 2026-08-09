(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorSaveButtonStateStore = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function resolveController(options = {}) {
    if (options.stateController && typeof options.stateController === 'object') {
      return options.stateController;
    }

    const controllerApi = root && root.SlideNextStudioEditorSaveButtonStateController;
    if (!controllerApi
      || typeof controllerApi.createStudioEditorSaveButtonStateController !== 'function') {
      return null;
    }

    return controllerApi.createStudioEditorSaveButtonStateController({
      initialState: options.initialState
    });
  }

  function createStudioEditorSaveButtonStateStore(options = {}) {
    const controller = resolveController(options);

    function getState() {
      return controller && typeof controller.getState === 'function'
        ? controller.getState()
        : 'idle';
    }

    function setState(nextState) {
      return controller && typeof controller.setState === 'function'
        ? controller.setState(nextState)
        : false;
    }

    function reset() {
      return controller && typeof controller.reset === 'function'
        ? controller.reset()
        : false;
    }

    return { getState, setState, reset };
  }

  return { createStudioEditorSaveButtonStateStore };
});
