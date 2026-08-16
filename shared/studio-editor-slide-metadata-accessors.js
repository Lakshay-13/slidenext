(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorSlideMetadataAccessors = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function createStudioEditorSlideMetadataAccessors(options = {}) {
    const runtimeApi = Object.prototype.hasOwnProperty.call(options, 'runtimeApi')
      ? options.runtimeApi
      : root && root.SlideNextStudioEditorSlideMetadataShellRuntime;
    const runtimeOptions = options.runtimeOptions || {};
    const shellOptions = { runtimeOptions };
    if (Object.prototype.hasOwnProperty.call(options, 'metadataRuntimeApi')) {
      shellOptions.metadataRuntimeApi = options.metadataRuntimeApi;
    }
    const runtime = runtimeApi
      && typeof runtimeApi.createStudioEditorSlideMetadataShellRuntime === 'function'
      ? runtimeApi.createStudioEditorSlideMetadataShellRuntime(shellOptions)
      : null;

    return { runtime };
  }

  return { createStudioEditorSlideMetadataAccessors };
});
