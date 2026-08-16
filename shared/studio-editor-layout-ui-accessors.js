(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorLayoutUiAccessors = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function createStudioEditorLayoutUiAccessors(options = {}) {
    const runtimeApi = Object.prototype.hasOwnProperty.call(options, 'runtimeApi')
      ? options.runtimeApi
      : root && root.SlideNextStudioEditorLayoutUiShellRuntime;
    const runtime = runtimeApi
      && typeof runtimeApi.createStudioEditorLayoutUiShellRuntime === 'function'
      ? runtimeApi.createStudioEditorLayoutUiShellRuntime({
          ...(options.runtimeOptions || {})
        })
      : null;

    return { runtime };
  }

  return { createStudioEditorLayoutUiAccessors };
});
