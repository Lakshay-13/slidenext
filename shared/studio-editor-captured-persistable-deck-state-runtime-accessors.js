(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorCapturedPersistableDeckStateRuntimeAccessors = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function createStudioEditorCapturedPersistableDeckStateRuntimeAccessors(options = {}) {
    const runtimeApi = Object.prototype.hasOwnProperty.call(options, 'runtimeApi')
      ? options.runtimeApi
      : root && root.SlideNextStudioEditorCapturedPersistableDeckStateShellRuntime;
    const runtimeOptions = options.runtimeOptions || {};
    const runtime = runtimeApi
      && typeof runtimeApi.createStudioEditorCapturedPersistableDeckStateShellRuntime === 'function'
      ? runtimeApi.createStudioEditorCapturedPersistableDeckStateShellRuntime(runtimeOptions)
      : null;

    return { runtime };
  }

  return { createStudioEditorCapturedPersistableDeckStateRuntimeAccessors };
});
