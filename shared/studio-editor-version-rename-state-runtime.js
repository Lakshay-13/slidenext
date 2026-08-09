(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorVersionRenameStateRuntime = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function createStudioEditorVersionRenameStateRuntime(options = {}) {
    const stateStore = options.stateStore
      || (root && root.SlideNextStudioEditorVersionRenameStateStore)
      || null;
    const versionRenameStateStore = stateStore
      && typeof stateStore.createStudioEditorVersionRenameStateStore === 'function'
      ? stateStore.createStudioEditorVersionRenameStateStore({})
      : null;

    return {
      versionRenameStateStore
    };
  }

  return {
    createStudioEditorVersionRenameStateRuntime
  };
});
