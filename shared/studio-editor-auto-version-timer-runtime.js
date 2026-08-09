(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorAutoVersionTimerRuntime = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function createStudioEditorAutoVersionTimerRuntime(options = {}) {
    const stateStore = options.stateStore
      || (root && root.SlideNextStudioEditorAutoVersionTimerStore)
      || null;
    const autoVersionTimerStore = stateStore
      && typeof stateStore.createStudioEditorAutoVersionTimerStore === 'function'
      ? stateStore.createStudioEditorAutoVersionTimerStore({})
      : null;

    return {
      autoVersionTimerStore
    };
  }

  return {
    createStudioEditorAutoVersionTimerRuntime
  };
});
