(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorLaunchShellControllerRuntimeAccessors = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function createStudioEditorLaunchShellControllerRuntimeAccessors(options = {}) {
    const runtimeApi = Object.prototype.hasOwnProperty.call(options, 'runtimeApi')
      ? options.runtimeApi
      : root && root.SlideNextStudioEditorLaunchShellController;
    const runtimeOptions = options.runtimeOptions || {};
    const runtime = runtimeApi
      && typeof runtimeApi.createStudioEditorLaunchShellController === 'function'
      ? runtimeApi.createStudioEditorLaunchShellController(runtimeOptions)
      : null;

    return { runtime };
  }

  return { createStudioEditorLaunchShellControllerRuntimeAccessors };
});
