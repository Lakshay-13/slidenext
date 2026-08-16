(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorThemeShellRuntime = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function resolveApi(options) {
    if (Object.prototype.hasOwnProperty.call(options, 'themeRuntimeApi')) {
      return options.themeRuntimeApi;
    }
    return root && root.SlideNextStudioEditorThemeRuntime
      ? root.SlideNextStudioEditorThemeRuntime
      : null;
  }

  function createStudioEditorThemeShellRuntime(options = {}) {
    const themeRuntimeApi = resolveApi(options);
    if (!themeRuntimeApi
      || typeof themeRuntimeApi.createStudioEditorThemeRuntime !== 'function') {
      return null;
    }

    const runtimeOptions = Object.prototype.hasOwnProperty.call(options, 'runtimeOptions')
      ? options.runtimeOptions
      : options;
    return themeRuntimeApi.createStudioEditorThemeRuntime(runtimeOptions || {});
  }

  return {
    createStudioEditorThemeShellRuntime
  };
});
