(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorStyleAccessors = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function createStudioEditorStyleAccessors(options = {}) {
    const runtimeApi = Object.prototype.hasOwnProperty.call(options, 'runtimeApi')
      ? options.runtimeApi
      : root && root.SlideNextStudioEditorStyleShellRuntime;
    const shellOptions = { ...(options.runtimeOptions || {}) };
    if (Object.prototype.hasOwnProperty.call(options, 'styleRuntimeApi')) {
      shellOptions.styleRuntimeApi = options.styleRuntimeApi;
    }
    const runtime = runtimeApi
      && typeof runtimeApi.createStudioEditorStyleShellRuntime === 'function'
      ? runtimeApi.createStudioEditorStyleShellRuntime(shellOptions)
      : null;

    return { runtime };
  }

  return { createStudioEditorStyleAccessors };
});
