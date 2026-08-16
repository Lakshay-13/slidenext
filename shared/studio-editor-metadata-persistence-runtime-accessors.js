(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorMetadataPersistenceRuntimeAccessors = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function createStudioEditorMetadataPersistenceRuntimeAccessors(options = {}) {
    const runtimeApi = Object.prototype.hasOwnProperty.call(options, 'runtimeApi')
      ? options.runtimeApi
      : root && root.SlideNextStudioEditorMetadataPersistenceShellRuntime;
    const runtimeOptions = options.runtimeOptions || {};
    const runtime = runtimeApi
      && typeof runtimeApi.createStudioEditorMetadataPersistenceShellRuntime === 'function'
      ? runtimeApi.createStudioEditorMetadataPersistenceShellRuntime(runtimeOptions)
      : null;

    return { runtime };
  }

  return { createStudioEditorMetadataPersistenceRuntimeAccessors };
});
