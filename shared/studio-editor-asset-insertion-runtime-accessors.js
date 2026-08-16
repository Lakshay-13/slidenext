(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorAssetInsertionRuntimeAccessors = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function createStudioEditorAssetInsertionRuntimeAccessors(options = {}) {
    const runtimeApi = Object.prototype.hasOwnProperty.call(options, 'runtimeApi')
      ? options.runtimeApi
      : root && root.SlideNextStudioEditorAssetInsertionShellRuntime;
    const shellOptions = { ...(options.runtimeOptions || {}) };
    if (Object.prototype.hasOwnProperty.call(options, 'assetInsertionApi')) {
      shellOptions.assetInsertionApi = options.assetInsertionApi;
    }
    const runtime = runtimeApi
      && typeof runtimeApi.createStudioEditorAssetInsertionShellRuntime === 'function'
      ? runtimeApi.createStudioEditorAssetInsertionShellRuntime(shellOptions)
      : null;

    return { runtime };
  }

  return { createStudioEditorAssetInsertionRuntimeAccessors };
});
