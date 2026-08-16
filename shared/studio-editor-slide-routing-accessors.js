(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorSlideRoutingAccessors = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function createStudioEditorSlideRoutingAccessors(options = {}) {
    const runtimeApi = Object.prototype.hasOwnProperty.call(options, 'runtimeApi')
      ? options.runtimeApi
      : root && root.SlideNextStudioEditorSlideRoutingShellRuntime;
    const runtimeOptions = options.runtimeOptions || {};
    const shellOptions = { runtimeOptions };
    if (Object.prototype.hasOwnProperty.call(options, 'routingRuntimeApi')) {
      shellOptions.routingRuntimeApi = options.routingRuntimeApi;
    }
    const runtime = runtimeApi
      && typeof runtimeApi.createStudioEditorSlideRoutingShellRuntime === 'function'
      ? runtimeApi.createStudioEditorSlideRoutingShellRuntime(shellOptions)
      : null;

    return { runtime };
  }

  return { createStudioEditorSlideRoutingAccessors };
});
