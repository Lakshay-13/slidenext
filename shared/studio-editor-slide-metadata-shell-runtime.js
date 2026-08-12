(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorSlideMetadataShellRuntime = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function resolveApi(options) {
    if (Object.prototype.hasOwnProperty.call(options, 'metadataRuntimeApi')) {
      return options.metadataRuntimeApi;
    }
    return root && root.SlideNextStudioEditorSlideMetadataRuntime
      ? root.SlideNextStudioEditorSlideMetadataRuntime
      : null;
  }

  function createStudioEditorSlideMetadataShellRuntime(options = {}) {
    const metadataRuntimeApi = resolveApi(options);
    if (!metadataRuntimeApi
      || typeof metadataRuntimeApi.createStudioEditorSlideMetadataRuntime !== 'function') {
      return null;
    }

    return metadataRuntimeApi.createStudioEditorSlideMetadataRuntime(options.runtimeOptions || {});
  }

  return {
    createStudioEditorSlideMetadataShellRuntime
  };
});
