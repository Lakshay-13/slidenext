(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorPersistedDeckStateRuntimeAccessors = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function createStudioEditorPersistedDeckStateRuntimeAccessors(options = {}) {
    const runtimeApi = Object.prototype.hasOwnProperty.call(options, 'runtimeApi')
      ? options.runtimeApi
      : root && root.SlideNextStudioEditorPersistedDeckStateShellRuntime;
    const runtimeOptions = options.runtimeOptions || {};
    const runtime = runtimeApi
      && typeof runtimeApi.createStudioEditorPersistedDeckStateShellRuntime === 'function'
      ? runtimeApi.createStudioEditorPersistedDeckStateShellRuntime(runtimeOptions)
      : null;

    return { runtime };
  }

  return { createStudioEditorPersistedDeckStateRuntimeAccessors };
});
