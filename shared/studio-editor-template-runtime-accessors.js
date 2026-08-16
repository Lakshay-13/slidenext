(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorTemplateRuntimeAccessors = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function createStudioEditorTemplateRuntimeAccessors(options = {}) {
    const runtimeApi = Object.prototype.hasOwnProperty.call(options, 'runtimeApi')
      ? options.runtimeApi
      : root && root.SlideNextStudioEditorTemplateShellRuntime;
    const shellOptions = { ...(options.runtimeOptions || {}) };
    if (Object.prototype.hasOwnProperty.call(options, 'templateRuntimeApi')) {
      shellOptions.templateRuntimeApi = options.templateRuntimeApi;
    }
    const runtime = runtimeApi
      && typeof runtimeApi.createStudioEditorTemplateShellRuntime === 'function'
      ? runtimeApi.createStudioEditorTemplateShellRuntime(shellOptions)
      : null;

    return { runtime };
  }

  return { createStudioEditorTemplateRuntimeAccessors };
});
