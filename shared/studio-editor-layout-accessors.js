(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorLayoutAccessors = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function createStudioEditorLayoutAccessors(options = {}) {
    const runtimeApi = Object.prototype.hasOwnProperty.call(options, 'runtimeApi')
      ? options.runtimeApi
      : root && root.SlideNextStudioEditorLayoutShellRuntime;
    const shellOptions = { ...(options.runtimeOptions || {}) };
    if (Object.prototype.hasOwnProperty.call(options, 'layoutRuntimeApi')) {
      shellOptions.layoutRuntimeApi = options.layoutRuntimeApi;
    }
    const runtime = runtimeApi
      && typeof runtimeApi.createStudioEditorLayoutShellRuntime === 'function'
      ? runtimeApi.createStudioEditorLayoutShellRuntime(shellOptions)
      : null;

    return { runtime };
  }

  return { createStudioEditorLayoutAccessors };
});
