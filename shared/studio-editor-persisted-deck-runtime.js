(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorPersistedDeckRuntime = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function createStudioEditorPersistedDeckRuntime(options = {}) {
    const stateStore = options.stateStore
      || (root && root.SlideNextStudioEditorPersistedDeckStateStore)
      || null;
    const persistedDeckStateStore = stateStore
      && typeof stateStore.createStudioEditorPersistedDeckStateStore === 'function'
      ? stateStore.createStudioEditorPersistedDeckStateStore({})
      : null;

    return {
      persistedDeckStateStore
    };
  }

  return {
    createStudioEditorPersistedDeckRuntime
  };
});
