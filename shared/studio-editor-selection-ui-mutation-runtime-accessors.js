(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorSelectionUiMutationRuntimeAccessors = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function createStudioEditorSelectionUiMutationRuntimeAccessors(options = {}) {
    const runtimeApi = Object.prototype.hasOwnProperty.call(options, 'runtimeApi')
      ? options.runtimeApi
      : root && root.SlideNextStudioEditorSelectionUiMutationShellRuntime;
    const runtimeOptions = options.runtimeOptions || {};
    const runtime = runtimeApi
      && typeof runtimeApi.createStudioEditorSelectionUiMutationShellRuntime === 'function'
      ? runtimeApi.createStudioEditorSelectionUiMutationShellRuntime(runtimeOptions)
      : null;

    return { runtime };
  }

  return { createStudioEditorSelectionUiMutationRuntimeAccessors };
});
