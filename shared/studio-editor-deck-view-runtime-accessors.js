(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorDeckViewRuntimeAccessors = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function createStudioEditorDeckViewRuntimeAccessors(options = {}) {
    const runtimeApi = Object.prototype.hasOwnProperty.call(options, 'runtimeApi')
      ? options.runtimeApi
      : root && root.SlideNextStudioEditorDeckViewShellRuntime;
    const shellOptions = { ...(options.runtimeOptions || {}) };
    if (Object.prototype.hasOwnProperty.call(options, 'deckViewRuntimeApi')) {
      shellOptions.deckViewRuntimeApi = options.deckViewRuntimeApi;
    }
    const runtime = runtimeApi
      && typeof runtimeApi.createStudioEditorDeckViewShellRuntime === 'function'
      ? runtimeApi.createStudioEditorDeckViewShellRuntime(shellOptions)
      : null;

    return { runtime };
  }

  return { createStudioEditorDeckViewRuntimeAccessors };
});
