(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorSessionStateRuntime = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function createStudioEditorSessionStateRuntime(options = {}) {
    const controllerApi = options.controllerApi
      || (root && root.SlideNextStudioEditorSessionState)
      || null;
    const sessionStateController = controllerApi
      && typeof controllerApi.createStudioEditorSessionStateController === 'function'
      ? controllerApi.createStudioEditorSessionStateController(options.controllerOptions || {})
      : null;

    return {
      sessionStateController
    };
  }

  return {
    createStudioEditorSessionStateRuntime
  };
});
