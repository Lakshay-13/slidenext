(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorClipboardInsertionRuntimeAccessors = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function createStudioEditorClipboardInsertionRuntimeAccessors(options = {}) {
    const runtimeApi = Object.prototype.hasOwnProperty.call(options, 'runtimeApi')
      ? options.runtimeApi
      : root && root.SlideNextStudioEditorClipboardInsertionShellRuntime;
    const shellOptions = { ...(options.runtimeOptions || {}) };
    if (Object.prototype.hasOwnProperty.call(options, 'insertionRuntimeApi')) {
      shellOptions.insertionRuntimeApi = options.insertionRuntimeApi;
    }
    const runtime = runtimeApi
      && typeof runtimeApi.createStudioEditorClipboardInsertionShellRuntime === 'function'
      ? runtimeApi.createStudioEditorClipboardInsertionShellRuntime(shellOptions)
      : null;

    return { runtime };
  }

  return { createStudioEditorClipboardInsertionRuntimeAccessors };
});
