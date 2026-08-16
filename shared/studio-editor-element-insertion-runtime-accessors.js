(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorElementInsertionRuntimeAccessors = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function createStudioEditorElementInsertionRuntimeAccessors(options = {}) {
    const runtimeApi = Object.prototype.hasOwnProperty.call(options, 'runtimeApi')
      ? options.runtimeApi
      : root && root.SlideNextStudioEditorElementInsertionShellRuntime;
    const shellOptions = { ...(options.runtimeOptions || {}) };
    if (Object.prototype.hasOwnProperty.call(options, 'insertionRuntimeApi')) {
      shellOptions.insertionRuntimeApi = options.insertionRuntimeApi;
    }
    const runtime = runtimeApi
      && typeof runtimeApi.createStudioEditorElementInsertionShellRuntime === 'function'
      ? runtimeApi.createStudioEditorElementInsertionShellRuntime(shellOptions)
      : null;

    return { runtime };
  }

  return { createStudioEditorElementInsertionRuntimeAccessors };
});
