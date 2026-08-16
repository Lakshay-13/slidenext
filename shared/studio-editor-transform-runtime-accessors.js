(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorTransformRuntimeAccessors = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function createStudioEditorTransformRuntimeAccessors(options = {}) {
    const runtimeApi = Object.prototype.hasOwnProperty.call(options, 'runtimeApi')
      ? options.runtimeApi
      : root && root.SlideNextStudioEditorTransformShellRuntime;
    const shellOptions = { ...(options.runtimeOptions || {}) };
    if (Object.prototype.hasOwnProperty.call(options, 'transformRuntimeApi')) {
      shellOptions.transformRuntimeApi = options.transformRuntimeApi;
    }
    const runtime = runtimeApi
      && typeof runtimeApi.createStudioEditorTransformShellRuntime === 'function'
      ? runtimeApi.createStudioEditorTransformShellRuntime(shellOptions)
      : null;

    return { runtime };
  }

  return { createStudioEditorTransformRuntimeAccessors };
});
