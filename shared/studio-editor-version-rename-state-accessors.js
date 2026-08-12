(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorVersionRenameStateAccessors = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function createStudioEditorVersionRenameStateAccessors(options = {}) {
    const bridge = options.bridge || null;
    const getFallbackState = typeof options.getFallbackState === 'function'
      ? options.getFallbackState
      : () => ({ filename: '', context: null });
    const setFallbackState = typeof options.setFallbackState === 'function'
      ? options.setFallbackState
      : () => getFallbackState();

    function getState() {
      return bridge && typeof bridge.getState === 'function'
        ? bridge.getState()
        : getFallbackState();
    }

    function setState(nextState = {}) {
      return bridge && typeof bridge.setState === 'function'
        ? bridge.setState(nextState)
        : setFallbackState(nextState);
    }

    function clear() {
      return bridge && typeof bridge.clear === 'function'
        ? bridge.clear()
        : setState();
    }

    return { bridge, getState, setState, clear };
  }

  function createStudioEditorVersionRenameStateGlobalApi(options = {}) {
    const accessors = options.accessors || createStudioEditorVersionRenameStateAccessors(options);

    return {
      getStudioRenameVersionState: () => accessors.getState(),
      setStudioRenameVersionState: (nextState = {}) => accessors.setState(nextState),
      clearStudioRenameVersionState: () => accessors.clear()
    };
  }

  return {
    createStudioEditorVersionRenameStateAccessors,
    createStudioEditorVersionRenameStateGlobalApi
  };
});
