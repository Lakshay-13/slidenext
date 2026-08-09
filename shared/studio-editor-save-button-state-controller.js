(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorSaveButtonStateController = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function normalizeSaveButtonState(state) {
    return state === 'saving-version' ? 'saving-version' : 'idle';
  }

  function createStudioEditorSaveButtonStateController(options = {}) {
    let state = normalizeSaveButtonState(options.initialState);

    return {
      getState: () => state,
      setState(nextState) {
        state = normalizeSaveButtonState(nextState);
        return state;
      },
      reset() {
        state = 'idle';
        return state;
      }
    };
  }

  return {
    createStudioEditorSaveButtonStateController,
    normalizeSaveButtonState
  };
});
