(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorVersionRenameModalRuntimeAccessors = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function createStudioEditorVersionRenameModalRuntimeAccessors(options = {}) {
    const runtimeApi = Object.prototype.hasOwnProperty.call(options, 'runtimeApi')
      ? options.runtimeApi
      : root && root.SlideNextStudioEditorVersionRenameModalShellRuntime;
    const shellOptions = { ...(options.runtimeOptions || {}) };
    const runtime = runtimeApi
      && typeof runtimeApi.createStudioEditorVersionRenameModalShellRuntime === 'function'
      ? runtimeApi.createStudioEditorVersionRenameModalShellRuntime(shellOptions)
      : null;

    return { runtime };
  }

  return { createStudioEditorVersionRenameModalRuntimeAccessors };
});
