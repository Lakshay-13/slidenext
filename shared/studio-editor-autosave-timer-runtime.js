(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorAutoSaveTimerRuntime = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function createStudioEditorAutoSaveTimerRuntime(options = {}) {
    const stateStore = options.stateStore
      || (root && root.SlideNextStudioEditorAutoSaveTimerStore)
      || null;
    const autoSaveTimerStore = stateStore
      && typeof stateStore.createStudioEditorAutoSaveTimerStore === 'function'
      ? stateStore.createStudioEditorAutoSaveTimerStore({})
      : null;

    return {
      autoSaveTimerStore
    };
  }

  return {
    createStudioEditorAutoSaveTimerRuntime
  };
});
