(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorFrameRuntimeAccessors = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function createStudioEditorFrameRuntimeAccessors(options = {}) {
    const runtimeApi = Object.prototype.hasOwnProperty.call(options, 'runtimeApi')
      ? options.runtimeApi
      : root && root.SlideNextStudioEditorFrameShellRuntime;
    const shellOptions = { ...(options.runtimeOptions || {}) };
    if (Object.prototype.hasOwnProperty.call(options, 'frameRuntimeApi')) {
      shellOptions.frameRuntimeApi = options.frameRuntimeApi;
    }
    const runtime = runtimeApi
      && typeof runtimeApi.createStudioEditorFrameShellRuntime === 'function'
      ? runtimeApi.createStudioEditorFrameShellRuntime(shellOptions)
      : null;

    return { runtime };
  }

  return { createStudioEditorFrameRuntimeAccessors };
});
