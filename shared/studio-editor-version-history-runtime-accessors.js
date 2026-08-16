(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorVersionHistoryRuntimeAccessors = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function createStudioEditorVersionHistoryRuntimeAccessors(options = {}) {
    const runtimeApi = Object.prototype.hasOwnProperty.call(options, 'runtimeApi')
      ? options.runtimeApi
      : root && root.SlideNextStudioEditorVersionHistoryShellRuntime;
    const runtimeOptions = options.runtimeOptions || {};
    const runtime = runtimeApi
      && typeof runtimeApi.createStudioEditorVersionHistoryShellRuntime === 'function'
      ? runtimeApi.createStudioEditorVersionHistoryShellRuntime(runtimeOptions)
      : null;

    return { runtime };
  }

  return { createStudioEditorVersionHistoryRuntimeAccessors };
});
