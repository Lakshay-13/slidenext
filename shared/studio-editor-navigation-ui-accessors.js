(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorNavigationUiAccessors = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function createStudioEditorNavigationUiAccessors(options = {}) {
    const runtimeApi = Object.prototype.hasOwnProperty.call(options, 'runtimeApi')
      ? options.runtimeApi
      : root && root.SlideNextStudioEditorNavigationUiShellRuntime;
    const runtime = runtimeApi
      && typeof runtimeApi.createStudioEditorNavigationUiShellRuntime === 'function'
      ? runtimeApi.createStudioEditorNavigationUiShellRuntime({
          navigationUiBridgeApi: options.navigationUiBridgeApi,
          navigationSync: options.navigationSync,
          thumbnailController: options.thumbnailController
        })
      : null;

    return {
      runtime,
      isAvailable: !!(runtime && runtime.isAvailable === true),
      navigationUiBridge: runtime && runtime.isAvailable === true
        ? runtime.navigationUiBridge
        : null
    };
  }

  return { createStudioEditorNavigationUiAccessors };
});
