(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorSaveButtonStateRuntime = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function createStudioEditorSaveButtonStateRuntime(options = {}) {
    const stateStore = options.stateStore
      || (root && root.SlideNextStudioEditorSaveButtonStateStore)
      || null;
    const saveButtonStateStore = stateStore
      && typeof stateStore.createStudioEditorSaveButtonStateStore === 'function'
      ? stateStore.createStudioEditorSaveButtonStateStore({})
      : null;

    return {
      saveButtonStateStore
    };
  }

  return {
    createStudioEditorSaveButtonStateRuntime
  };
});
