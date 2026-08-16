(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorHistoryControllerRuntimeAccessors = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function createStudioEditorHistoryControllerRuntimeAccessors(options = {}) {
    const runtimeApi = Object.prototype.hasOwnProperty.call(options, 'runtimeApi')
      ? options.runtimeApi
      : root && root.SlideNextStudioEditorHistoryControllerShellRuntime;
    const shellOptions = { ...(options.runtimeOptions || {}) };
    if (Object.prototype.hasOwnProperty.call(options, 'historyRuntimeApi')) {
      shellOptions.historyRuntimeApi = options.historyRuntimeApi;
    }
    const runtime = runtimeApi
      && typeof runtimeApi.createStudioEditorHistoryControllerShellRuntime === 'function'
      ? runtimeApi.createStudioEditorHistoryControllerShellRuntime(shellOptions)
      : null;

    return { runtime };
  }

  return { createStudioEditorHistoryControllerRuntimeAccessors };
});
