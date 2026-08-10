(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorVersionRenameStateBridge = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function resolveStateStore(options = {}) {
    if (options.stateStore && typeof options.stateStore === 'object') {
      return options.stateStore;
    }
    const runtime = root && root.SlideNextStudioEditorVersionRenameStateRuntime;
    return runtime && typeof runtime.createStudioEditorVersionRenameStateRuntime === 'function'
      ? runtime.createStudioEditorVersionRenameStateRuntime().versionRenameStateStore
      : null;
  }

  function createStudioEditorVersionRenameStateBridge(options = {}) {
    const stateStore = resolveStateStore(options);

    function getState() {
      return stateStore && typeof stateStore.getState === 'function'
        ? stateStore.getState()
        : { filename: '', context: null };
    }

    function setState(nextState = {}) {
      return stateStore && typeof stateStore.setState === 'function'
        ? stateStore.setState(nextState)
        : false;
    }

    function clear() {
      return stateStore && typeof stateStore.clear === 'function'
        ? stateStore.clear()
        : false;
    }

    return { getState, setState, clear };
  }

  return { createStudioEditorVersionRenameStateBridge };
});
