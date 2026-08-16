(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorLayerOrderRuntimeAccessors = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function createStudioEditorLayerOrderRuntimeAccessors(options = {}) {
    const runtimeApi = Object.prototype.hasOwnProperty.call(options, 'runtimeApi')
      ? options.runtimeApi
      : root && root.SlideNextStudioEditorLayerOrderShellRuntime;
    const shellOptions = { ...(options.runtimeOptions || {}) };
    if (Object.prototype.hasOwnProperty.call(options, 'layerOrderRuntimeApi')) {
      shellOptions.layerOrderRuntimeApi = options.layerOrderRuntimeApi;
    }
    const runtime = runtimeApi
      && typeof runtimeApi.createStudioEditorLayerOrderShellRuntime === 'function'
      ? runtimeApi.createStudioEditorLayerOrderShellRuntime(shellOptions)
      : null;

    return { runtime };
  }

  return { createStudioEditorLayerOrderRuntimeAccessors };
});
