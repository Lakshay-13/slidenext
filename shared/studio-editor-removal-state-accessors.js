(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorRemovalStateAccessors = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function createStudioEditorRemovalStateAccessors(options = {}) {
    const runtimeApi = Object.prototype.hasOwnProperty.call(options, 'runtimeApi')
      ? options.runtimeApi
      : root && root.SlideNextStudioEditorRemovalStateShellRuntime;
    const shellOptions = { ...(options.runtimeOptions || {}) };
    if (Object.prototype.hasOwnProperty.call(options, 'removalStateApi')) {
      shellOptions.removalStateApi = options.removalStateApi;
    }
    const runtime = runtimeApi
      && typeof runtimeApi.createStudioEditorRemovalStateShellRuntime === 'function'
      ? runtimeApi.createStudioEditorRemovalStateShellRuntime(shellOptions)
      : null;

    return { runtime };
  }

  return { createStudioEditorRemovalStateAccessors };
});
