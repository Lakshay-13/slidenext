(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorSelectionCompositionRuntimeAccessors = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function createStudioEditorSelectionCompositionRuntimeAccessors(options = {}) {
    const runtimeApi = Object.prototype.hasOwnProperty.call(options, 'runtimeApi')
      ? options.runtimeApi
      : root && root.SlideNextStudioEditorSelectionCompositionShellRuntime;
    const runtimeOptions = options.runtimeOptions || {};
    const runtime = runtimeApi
      && typeof runtimeApi.createStudioEditorSelectionCompositionShellRuntime === 'function'
      ? runtimeApi.createStudioEditorSelectionCompositionShellRuntime(runtimeOptions)
      : null;

    return { runtime };
  }

  return { createStudioEditorSelectionCompositionRuntimeAccessors };
});
