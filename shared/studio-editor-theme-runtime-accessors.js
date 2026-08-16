(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorThemeRuntimeAccessors = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function createStudioEditorThemeRuntimeAccessors(options = {}) {
    const runtimeApi = Object.prototype.hasOwnProperty.call(options, 'runtimeApi')
      ? options.runtimeApi
      : root && root.SlideNextStudioEditorThemeShellRuntime;
    const shellOptions = { ...(options.runtimeOptions || {}) };
    if (Object.prototype.hasOwnProperty.call(options, 'themeRuntimeApi')) {
      shellOptions.themeRuntimeApi = options.themeRuntimeApi;
    }
    const runtime = runtimeApi
      && typeof runtimeApi.createStudioEditorThemeShellRuntime === 'function'
      ? runtimeApi.createStudioEditorThemeShellRuntime(shellOptions)
      : null;

    return { runtime };
  }

  return { createStudioEditorThemeRuntimeAccessors };
});
