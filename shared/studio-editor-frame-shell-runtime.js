(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorFrameShellRuntime = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function resolveApi(options) {
    if (Object.prototype.hasOwnProperty.call(options, 'frameRuntimeApi')) {
      return options.frameRuntimeApi;
    }
    return root && root.SlideNextStudioEditorFrameRuntime
      ? root.SlideNextStudioEditorFrameRuntime
      : null;
  }

  function createStudioEditorFrameShellRuntime(options = {}) {
    const frameRuntimeApi = resolveApi(options);
    if (!frameRuntimeApi
      || typeof frameRuntimeApi.createStudioEditorFrameRuntime !== 'function') {
      return null;
    }

    return frameRuntimeApi.createStudioEditorFrameRuntime(options.runtimeOptions || {});
  }

  return {
    createStudioEditorFrameShellRuntime
  };
});
