(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorBlockRuntimeAccessors = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function createStudioEditorBlockRuntimeAccessors(options = {}) {
    const runtimeApi = Object.prototype.hasOwnProperty.call(options, 'runtimeApi')
      ? options.runtimeApi
      : root && root.SlideNextStudioEditorBlockShellRuntime;
    const shellOptions = { ...(options.runtimeOptions || {}) };
    if (Object.prototype.hasOwnProperty.call(options, 'blockRuntimeApi')) {
      shellOptions.blockRuntimeApi = options.blockRuntimeApi;
    }
    const runtime = runtimeApi
      && typeof runtimeApi.createStudioEditorBlockShellRuntime === 'function'
      ? runtimeApi.createStudioEditorBlockShellRuntime(shellOptions)
      : null;

    return { runtime };
  }

  return { createStudioEditorBlockRuntimeAccessors };
});
