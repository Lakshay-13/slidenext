(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorPersistableDeckHtmlRuntimeAccessors = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function createStudioEditorPersistableDeckHtmlRuntimeAccessors(options = {}) {
    const runtimeApi = Object.prototype.hasOwnProperty.call(options, 'runtimeApi')
      ? options.runtimeApi
      : root && root.SlideNextStudioEditorPersistableDeckHtmlShellRuntime;
    const runtimeOptions = options.runtimeOptions || {};
    const runtime = runtimeApi
      && typeof runtimeApi.createStudioEditorPersistableDeckHtmlShellRuntime === 'function'
      ? runtimeApi.createStudioEditorPersistableDeckHtmlShellRuntime(runtimeOptions)
      : null;

    return { runtime };
  }

  return { createStudioEditorPersistableDeckHtmlRuntimeAccessors };
});
