(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorMasterSlideStateRuntimeAccessors = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function createStudioEditorMasterSlideStateRuntimeAccessors(options = {}) {
    const runtimeApi = Object.prototype.hasOwnProperty.call(options, 'runtimeApi')
      ? options.runtimeApi
      : root && root.SlideNextStudioEditorMasterSlideState;

    return {
      createStudioEditorMasterSlideStateController(runtimeOptions = {}) {
        return runtimeApi
          && typeof runtimeApi.createStudioEditorMasterSlideStateController === 'function'
          ? runtimeApi.createStudioEditorMasterSlideStateController(runtimeOptions)
          : null;
      }
    };
  }

  return { createStudioEditorMasterSlideStateRuntimeAccessors };
});
