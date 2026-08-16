(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorClipboardSelectionRuntimeAccessors = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function createStudioEditorClipboardSelectionRuntimeAccessors(options = {}) {
    const runtimeApi = Object.prototype.hasOwnProperty.call(options, 'runtimeApi')
      ? options.runtimeApi
      : root && root.SlideNextStudioEditorClipboardSelectionShellRuntime;
    const shellOptions = { ...(options.runtimeOptions || {}) };
    if (Object.prototype.hasOwnProperty.call(options, 'selectionRuntimeApi')) {
      shellOptions.selectionRuntimeApi = options.selectionRuntimeApi;
    }
    const runtime = runtimeApi
      && typeof runtimeApi.createStudioEditorClipboardSelectionShellRuntime === 'function'
      ? runtimeApi.createStudioEditorClipboardSelectionShellRuntime(shellOptions)
      : null;

    return { runtime };
  }

  return { createStudioEditorClipboardSelectionRuntimeAccessors };
});
