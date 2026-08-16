(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorAutoVersionRuntimeAccessors = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function createStudioEditorAutoVersionRuntimeAccessors(options = {}) {
    const runtimeApi = Object.prototype.hasOwnProperty.call(options, 'runtimeApi')
      ? options.runtimeApi
      : root && root.SlideNextStudioEditorAutoVersionShellRuntime;
    const shellOptions = { ...(options.runtimeOptions || {}) };
    if (Object.prototype.hasOwnProperty.call(options, 'autoVersionRuntimeApi')) {
      shellOptions.autoVersionRuntimeApi = options.autoVersionRuntimeApi;
    }
    const runtime = runtimeApi
      && typeof runtimeApi.createStudioEditorAutoVersionShellRuntime === 'function'
      ? runtimeApi.createStudioEditorAutoVersionShellRuntime(shellOptions)
      : null;

    return { runtime };
  }

  return { createStudioEditorAutoVersionRuntimeAccessors };
});
