(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorShellStateRuntimeAccessors = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function createStudioEditorShellStateRuntimeAccessors(options = {}) {
    const runtimeApi = Object.prototype.hasOwnProperty.call(options, 'runtimeApi')
      ? options.runtimeApi
      : root && root.SlideNextStudioEditorShellStateRuntime;
    const runtimeOptions = options.runtimeOptions || {};
    const runtime = runtimeApi
      && typeof runtimeApi.createStudioEditorShellStateRuntime === 'function'
      ? runtimeApi.createStudioEditorShellStateRuntime(runtimeOptions)
      : null;

    return { runtime };
  }

  return { createStudioEditorShellStateRuntimeAccessors };
});
