(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorGroupStateAccessors = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function createStudioEditorGroupStateAccessors(options = {}) {
    const runtimeApi = Object.prototype.hasOwnProperty.call(options, 'runtimeApi')
      ? options.runtimeApi
      : root && root.SlideNextStudioEditorGroupStateShellRuntime;
    const shellOptions = { ...(options.runtimeOptions || {}) };
    if (Object.prototype.hasOwnProperty.call(options, 'groupStateApi')) {
      shellOptions.groupStateApi = options.groupStateApi;
    }
    const runtime = runtimeApi
      && typeof runtimeApi.createStudioEditorGroupStateShellRuntime === 'function'
      ? runtimeApi.createStudioEditorGroupStateShellRuntime(shellOptions)
      : null;

    return { runtime };
  }

  return { createStudioEditorGroupStateAccessors };
});
