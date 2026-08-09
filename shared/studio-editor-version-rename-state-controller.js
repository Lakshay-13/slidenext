(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorVersionRenameStateController = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function normalizeState(state = {}) {
    return {
      filename: typeof state.filename === 'string' ? state.filename : '',
      context: typeof state.context === 'undefined' ? null : state.context
    };
  }

  function createStudioEditorVersionRenameStateController(options = {}) {
    let state = normalizeState({
      filename: options.initialFilename,
      context: options.initialContext
    });

    return {
      getState: () => state,
      setState(nextState) {
        state = normalizeState(nextState);
        return state;
      },
      clear() {
        state = normalizeState();
        return state;
      }
    };
  }

  return {
    createStudioEditorVersionRenameStateController,
    normalizeState
  };
});
