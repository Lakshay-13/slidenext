(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorPersistenceRuntimeAccessors = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function createStudioEditorPersistenceRuntimeAccessors(options = {}) {
    const runtimeApi = Object.prototype.hasOwnProperty.call(options, 'runtimeApi')
      ? options.runtimeApi
      : root && root.SlideNextStudioEditorPersistenceShellRuntime;
    const shellOptions = { ...(options.runtimeOptions || {}) };
    if (Object.prototype.hasOwnProperty.call(options, 'persistenceRuntimeApi')) {
      shellOptions.persistenceRuntimeApi = options.persistenceRuntimeApi;
    }
    const runtime = runtimeApi
      && typeof runtimeApi.createStudioEditorPersistenceShellRuntime === 'function'
      ? runtimeApi.createStudioEditorPersistenceShellRuntime(shellOptions)
      : null;

    return { runtime };
  }

  return { createStudioEditorPersistenceRuntimeAccessors };
});
