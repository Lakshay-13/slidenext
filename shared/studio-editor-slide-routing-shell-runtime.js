(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorSlideRoutingShellRuntime = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function resolveApi(options) {
    if (Object.prototype.hasOwnProperty.call(options, 'routingRuntimeApi')) {
      return options.routingRuntimeApi;
    }
    return root && root.SlideNextStudioEditorSlideRoutingRuntime
      ? root.SlideNextStudioEditorSlideRoutingRuntime
      : null;
  }

  function createStudioEditorSlideRoutingShellRuntime(options = {}) {
    const routingRuntimeApi = resolveApi(options);
    if (!routingRuntimeApi
      || typeof routingRuntimeApi.createStudioEditorSlideRoutingRuntime !== 'function') {
      return null;
    }

    return routingRuntimeApi.createStudioEditorSlideRoutingRuntime(options.runtimeOptions || {});
  }

  return {
    createStudioEditorSlideRoutingShellRuntime
  };
});
