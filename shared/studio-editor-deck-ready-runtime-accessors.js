(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorDeckReadyRuntimeAccessors = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function createStudioEditorDeckReadyRuntimeAccessors(options = {}) {
    const runtimeApi = Object.prototype.hasOwnProperty.call(options, 'runtimeApi')
      ? options.runtimeApi
      : root && root.SlideNextStudioEditorDeckReadyShellRuntime;
    const shellOptions = { ...(options.runtimeOptions || {}) };
    if (Object.prototype.hasOwnProperty.call(options, 'deckReadyRuntimeApi')) {
      shellOptions.deckReadyRuntimeApi = options.deckReadyRuntimeApi;
    }
    const runtime = runtimeApi
      && typeof runtimeApi.createStudioEditorDeckReadyShellRuntime === 'function'
      ? runtimeApi.createStudioEditorDeckReadyShellRuntime(shellOptions)
      : null;

    return { runtime };
  }

  return { createStudioEditorDeckReadyRuntimeAccessors };
});
