(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorPersistedHtmlRuntimeAccessors = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function createStudioEditorPersistedHtmlRuntimeAccessors(options = {}) {
    const runtimeApi = Object.prototype.hasOwnProperty.call(options, 'runtimeApi')
      ? options.runtimeApi
      : root && root.SlideNextStudioEditorPersistedHtmlShellRuntime;
    const runtimeOptions = options.runtimeOptions || {};
    const runtime = runtimeApi
      && typeof runtimeApi.createStudioEditorPersistedHtmlShellRuntime === 'function'
      ? runtimeApi.createStudioEditorPersistedHtmlShellRuntime(runtimeOptions)
      : null;

    return { runtime };
  }

  return { createStudioEditorPersistedHtmlRuntimeAccessors };
});
