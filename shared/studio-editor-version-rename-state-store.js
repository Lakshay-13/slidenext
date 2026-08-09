(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorVersionRenameStateStore = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function resolveController(options = {}) {
    if (options.stateController && typeof options.stateController === 'object') {
      return options.stateController;
    }

    const controllerApi = root && root.SlideNextStudioEditorVersionRenameStateController;
    if (!controllerApi
      || typeof controllerApi.createStudioEditorVersionRenameStateController !== 'function') {
      return null;
    }

    return controllerApi.createStudioEditorVersionRenameStateController({
      initialFilename: options.initialFilename,
      initialContext: options.initialContext
    });
  }

  function createStudioEditorVersionRenameStateStore(options = {}) {
    const controller = resolveController(options);

    function getState() {
      return controller && typeof controller.getState === 'function'
        ? controller.getState()
        : { filename: '', context: null };
    }

    function setState(nextState = {}) {
      return controller && typeof controller.setState === 'function'
        ? controller.setState(nextState)
        : false;
    }

    function clear() {
      return controller && typeof controller.clear === 'function'
        ? controller.clear()
        : false;
    }

    return { getState, setState, clear };
  }

  return { createStudioEditorVersionRenameStateStore };
});
