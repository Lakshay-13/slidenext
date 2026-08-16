(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorLayerOrderStateAccessors = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function createStudioEditorLayerOrderStateAccessors(options = {}) {
    const runtimeApi = Object.prototype.hasOwnProperty.call(options, 'runtimeApi')
      ? options.runtimeApi
      : root && root.SlideNextStudioEditorLayerOrderStateShellRuntime;
    const shellOptions = { ...(options.runtimeOptions || {}) };
    if (Object.prototype.hasOwnProperty.call(options, 'layerOrderStateApi')) {
      shellOptions.layerOrderStateApi = options.layerOrderStateApi;
    }
    const runtime = runtimeApi
      && typeof runtimeApi.createStudioEditorLayerOrderStateShellRuntime === 'function'
      ? runtimeApi.createStudioEditorLayerOrderStateShellRuntime(shellOptions)
      : null;

    return { runtime };
  }

  return { createStudioEditorLayerOrderStateAccessors };
});
