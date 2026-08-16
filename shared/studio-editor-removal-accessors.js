(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorRemovalAccessors = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function createStudioEditorRemovalAccessors(options = {}) {
    const runtimeApi = Object.prototype.hasOwnProperty.call(options, 'runtimeApi')
      ? options.runtimeApi
      : root && root.SlideNextStudioEditorRemovalShellRuntime;
    const shellOptions = { ...(options.runtimeOptions || {}) };
    if (Object.prototype.hasOwnProperty.call(options, 'removalRuntimeApi')) {
      shellOptions.removalRuntimeApi = options.removalRuntimeApi;
    }
    const runtime = runtimeApi
      && typeof runtimeApi.createStudioEditorRemovalShellRuntime === 'function'
      ? runtimeApi.createStudioEditorRemovalShellRuntime(shellOptions)
      : null;

    return { runtime };
  }

  return { createStudioEditorRemovalAccessors };
});
