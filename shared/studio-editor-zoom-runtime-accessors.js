(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorZoomRuntimeAccessors = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function createStudioEditorZoomRuntimeAccessors(options = {}) {
    const runtimeApi = Object.prototype.hasOwnProperty.call(options, 'runtimeApi')
      ? options.runtimeApi
      : root && root.SlideNextStudioEditorZoomShellRuntime;
    const shellOptions = { ...(options.runtimeOptions || {}) };
    if (Object.prototype.hasOwnProperty.call(options, 'zoomRuntimeApi')) {
      shellOptions.zoomRuntimeApi = options.zoomRuntimeApi;
    }
    const runtime = runtimeApi
      && typeof runtimeApi.createStudioEditorZoomShellRuntime === 'function'
      ? runtimeApi.createStudioEditorZoomShellRuntime(shellOptions)
      : null;

    return { runtime };
  }

  return { createStudioEditorZoomRuntimeAccessors };
});
