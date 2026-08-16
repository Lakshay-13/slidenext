(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorSessionRuntimeAccessors = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function createStudioEditorSessionRuntimeAccessors(options = {}) {
    const runtimeApi = Object.prototype.hasOwnProperty.call(options, 'runtimeApi')
      ? options.runtimeApi
      : root && root.SlideNextStudioEditorSessionShellRuntime;
    const shellOptions = { ...(options.runtimeOptions || {}) };
    if (Object.prototype.hasOwnProperty.call(options, 'sessionRuntimeApi')) {
      shellOptions.sessionRuntimeApi = options.sessionRuntimeApi;
    }
    const runtime = runtimeApi
      && typeof runtimeApi.createStudioEditorSessionShellRuntime === 'function'
      ? runtimeApi.createStudioEditorSessionShellRuntime(shellOptions)
      : null;

    return { runtime };
  }

  return { createStudioEditorSessionRuntimeAccessors };
});
