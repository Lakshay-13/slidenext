(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorMasterSlideRuntimeAccessors = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function createStudioEditorMasterSlideRuntimeAccessors(options = {}) {
    const runtimeApi = Object.prototype.hasOwnProperty.call(options, 'runtimeApi')
      ? options.runtimeApi
      : root && root.SlideNextStudioEditorMasterSlideShellRuntime;
    const shellOptions = { ...(options.runtimeOptions || {}) };
    if (Object.prototype.hasOwnProperty.call(options, 'masterSlideRuntimeApi')) {
      shellOptions.masterSlideRuntimeApi = options.masterSlideRuntimeApi;
    }
    const runtime = runtimeApi
      && typeof runtimeApi.createStudioEditorMasterSlideShellRuntime === 'function'
      ? runtimeApi.createStudioEditorMasterSlideShellRuntime(shellOptions)
      : null;

    return { runtime };
  }

  return { createStudioEditorMasterSlideRuntimeAccessors };
});
