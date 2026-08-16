(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorPersistableDeckSanitizerRuntimeAccessors = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function createStudioEditorPersistableDeckSanitizerRuntimeAccessors(options = {}) {
    const runtimeApi = Object.prototype.hasOwnProperty.call(options, 'runtimeApi')
      ? options.runtimeApi
      : root && root.SlideNextStudioEditorPersistableDeckSanitizerShellRuntime;
    const runtimeOptions = options.runtimeOptions || {};
    const runtime = runtimeApi
      && typeof runtimeApi.createStudioEditorPersistableDeckSanitizerShellRuntime === 'function'
      ? runtimeApi.createStudioEditorPersistableDeckSanitizerShellRuntime(runtimeOptions)
      : null;

    return { runtime };
  }

  return { createStudioEditorPersistableDeckSanitizerRuntimeAccessors };
});
