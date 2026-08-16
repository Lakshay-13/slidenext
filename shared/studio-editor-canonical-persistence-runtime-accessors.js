(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorCanonicalPersistenceRuntimeAccessors = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function createStudioEditorCanonicalPersistenceRuntimeAccessors(options = {}) {
    const runtimeApi = Object.prototype.hasOwnProperty.call(options, 'runtimeApi')
      ? options.runtimeApi
      : root && root.SlideNextStudioEditorCanonicalPersistenceShellRuntime;
    const runtimeOptions = options.runtimeOptions || {};
    const runtime = runtimeApi
      && typeof runtimeApi.createStudioEditorCanonicalPersistenceShellRuntime === 'function'
      ? runtimeApi.createStudioEditorCanonicalPersistenceShellRuntime(runtimeOptions)
      : null;

    return { runtime };
  }

  return { createStudioEditorCanonicalPersistenceRuntimeAccessors };
});
