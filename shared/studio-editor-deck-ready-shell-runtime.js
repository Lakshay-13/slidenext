(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorDeckReadyShellRuntime = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function resolveApi(options) {
    if (Object.prototype.hasOwnProperty.call(options, 'deckReadyRuntimeApi')) {
      return options.deckReadyRuntimeApi;
    }
    return root && root.SlideNextStudioEditorDeckReadyRuntime
      ? root.SlideNextStudioEditorDeckReadyRuntime
      : null;
  }

  function createStudioEditorDeckReadyShellRuntime(options = {}) {
    const deckReadyRuntimeApi = resolveApi(options);
    if (!deckReadyRuntimeApi
      || typeof deckReadyRuntimeApi.createStudioEditorDeckReadyRuntime !== 'function') {
      return null;
    }

    const runtimeOptions = Object.prototype.hasOwnProperty.call(options, 'runtimeOptions')
      ? options.runtimeOptions
      : options;
    return deckReadyRuntimeApi.createStudioEditorDeckReadyRuntime(runtimeOptions || {});
  }

  return {
    createStudioEditorDeckReadyShellRuntime
  };
});
