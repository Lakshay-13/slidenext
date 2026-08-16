(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorSourceRuntimeAccessors = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function createStudioEditorSourceRuntimeAccessors(options = {}) {
    const runtimeApi = Object.prototype.hasOwnProperty.call(options, 'runtimeApi')
      ? options.runtimeApi
      : root && root.SlideNextStudioEditorSourceShellRuntime;
    const shellOptions = { ...(options.runtimeOptions || {}) };
    if (Object.prototype.hasOwnProperty.call(options, 'sourceRuntimeApi')) {
      shellOptions.sourceRuntimeApi = options.sourceRuntimeApi;
    }
    const runtime = runtimeApi
      && typeof runtimeApi.createStudioEditorSourceShellRuntime === 'function'
      ? runtimeApi.createStudioEditorSourceShellRuntime(shellOptions)
      : null;

    return { runtime };
  }

  return { createStudioEditorSourceRuntimeAccessors };
});
