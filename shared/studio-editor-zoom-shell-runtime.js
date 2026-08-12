(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorZoomShellRuntime = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function resolveApi(options) {
    if (Object.prototype.hasOwnProperty.call(options, 'zoomRuntimeApi')) {
      return options.zoomRuntimeApi;
    }
    return root && root.SlideNextStudioEditorZoomRuntime
      ? root.SlideNextStudioEditorZoomRuntime
      : null;
  }

  function createStudioEditorZoomShellRuntime(options = {}) {
    const zoomRuntimeApi = resolveApi(options);
    if (!zoomRuntimeApi
      || typeof zoomRuntimeApi.createStudioEditorZoomRuntime !== 'function') {
      return null;
    }

    return zoomRuntimeApi.createStudioEditorZoomRuntime(options.runtimeOptions || {});
  }

  return {
    createStudioEditorZoomShellRuntime
  };
});
