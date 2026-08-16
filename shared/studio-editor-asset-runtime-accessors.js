(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorAssetRuntimeAccessors = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function createStudioEditorAssetRuntimeAccessors(options = {}) {
    const runtimeApi = Object.prototype.hasOwnProperty.call(options, 'runtimeApi')
      ? options.runtimeApi
      : root && root.SlideNextStudioEditorAssetShellRuntime;
    const shellOptions = { ...(options.runtimeOptions || {}) };
    if (Object.prototype.hasOwnProperty.call(options, 'assetRuntimeApi')) {
      shellOptions.assetRuntimeApi = options.assetRuntimeApi;
    }
    const runtime = runtimeApi
      && typeof runtimeApi.createStudioEditorAssetShellRuntime === 'function'
      ? runtimeApi.createStudioEditorAssetShellRuntime(shellOptions)
      : null;

    return { runtime };
  }

  return { createStudioEditorAssetRuntimeAccessors };
});
