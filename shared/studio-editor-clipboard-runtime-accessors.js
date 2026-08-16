(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorClipboardRuntimeAccessors = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function createStudioEditorClipboardRuntimeAccessors(options = {}) {
    const runtimeApi = Object.prototype.hasOwnProperty.call(options, 'runtimeApi')
      ? options.runtimeApi
      : root && root.SlideNextStudioEditorClipboardShellRuntime;
    const shellOptions = { ...(options.runtimeOptions || {}) };
    if (Object.prototype.hasOwnProperty.call(options, 'clipboardRuntimeApi')) {
      shellOptions.clipboardRuntimeApi = options.clipboardRuntimeApi;
    }
    const runtime = runtimeApi
      && typeof runtimeApi.createStudioEditorClipboardShellRuntime === 'function'
      ? runtimeApi.createStudioEditorClipboardShellRuntime(shellOptions)
      : null;

    return { runtime };
  }

  return { createStudioEditorClipboardRuntimeAccessors };
});
