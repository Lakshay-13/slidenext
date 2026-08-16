(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorGridSnapRuntimeAccessors = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function createStudioEditorGridSnapRuntimeAccessors(options = {}) {
    const runtimeApi = Object.prototype.hasOwnProperty.call(options, 'runtimeApi')
      ? options.runtimeApi
      : root && root.SlideNextStudioEditorGridSnapShellRuntime;
    const shellOptions = { ...(options.runtimeOptions || {}) };
    if (Object.prototype.hasOwnProperty.call(options, 'gridSnapRuntimeApi')) {
      shellOptions.gridSnapRuntimeApi = options.gridSnapRuntimeApi;
    }
    const runtime = runtimeApi
      && typeof runtimeApi.createStudioEditorGridSnapShellRuntime === 'function'
      ? runtimeApi.createStudioEditorGridSnapShellRuntime(shellOptions)
      : null;

    return { runtime };
  }

  return { createStudioEditorGridSnapRuntimeAccessors };
});
