(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorLayerOrderZIndexRuntimeAccessors = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function createStudioEditorLayerOrderZIndexRuntimeAccessors(options = {}) {
    const runtimeApi = Object.prototype.hasOwnProperty.call(options, 'runtimeApi')
      ? options.runtimeApi
      : root && root.SlideNextStudioEditorLayerOrderZIndexShellRuntime;
    const runtimeOptions = options.runtimeOptions || {};
    const runtime = runtimeApi
      && typeof runtimeApi.createStudioEditorLayerOrderZIndexShellRuntime === 'function'
      ? runtimeApi.createStudioEditorLayerOrderZIndexShellRuntime(runtimeOptions)
      : null;

    return { runtime };
  }

  return { createStudioEditorLayerOrderZIndexRuntimeAccessors };
});
