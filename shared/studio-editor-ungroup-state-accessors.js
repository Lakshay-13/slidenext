(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorUngroupStateAccessors = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function createStudioEditorUngroupStateAccessors(options = {}) {
    const runtimeApi = Object.prototype.hasOwnProperty.call(options, 'runtimeApi')
      ? options.runtimeApi
      : root && root.SlideNextStudioEditorUngroupStateShellRuntime;
    const shellOptions = { ...(options.runtimeOptions || {}) };
    if (Object.prototype.hasOwnProperty.call(options, 'ungroupStateApi')) {
      shellOptions.ungroupStateApi = options.ungroupStateApi;
    }
    const runtime = runtimeApi
      && typeof runtimeApi.createStudioEditorUngroupStateShellRuntime === 'function'
      ? runtimeApi.createStudioEditorUngroupStateShellRuntime(shellOptions)
      : null;

    return { runtime };
  }

  return { createStudioEditorUngroupStateAccessors };
});
