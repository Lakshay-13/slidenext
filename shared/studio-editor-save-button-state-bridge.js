(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorSaveButtonStateBridge = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function resolveStateStore(options = {}) {
    if (options.stateStore && typeof options.stateStore === 'object') {
      return options.stateStore;
    }
    const runtime = root && root.SlideNextStudioEditorSaveButtonStateRuntime;
    return runtime && typeof runtime.createStudioEditorSaveButtonStateRuntime === 'function'
      ? runtime.createStudioEditorSaveButtonStateRuntime().saveButtonStateStore
      : null;
  }

  function createStudioEditorSaveButtonStateBridge(options = {}) {
    const stateStore = resolveStateStore(options);

    function getState() {
      return stateStore && typeof stateStore.getState === 'function'
        ? stateStore.getState()
        : 'idle';
    }

    function setState(nextState) {
      return stateStore && typeof stateStore.setState === 'function'
        ? stateStore.setState(nextState)
        : false;
    }

    function reset() {
      return stateStore && typeof stateStore.reset === 'function'
        ? stateStore.reset()
        : false;
    }

    return { getState, setState, reset };
  }

  return { createStudioEditorSaveButtonStateBridge };
});
