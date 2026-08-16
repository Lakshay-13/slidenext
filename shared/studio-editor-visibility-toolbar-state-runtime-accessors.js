(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorVisibilityToolbarStateRuntimeAccessors = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function createStudioEditorVisibilityToolbarStateRuntimeAccessors(options = {}) {
    const runtimeApi = Object.prototype.hasOwnProperty.call(options, 'runtimeApi')
      ? options.runtimeApi
      : root && root.SlideNextStudioEditorVisibilityToolbarState;

    return {
      createStudioEditorVisibilityToolbarStateController(runtimeOptions = {}) {
        return runtimeApi
          && typeof runtimeApi.createStudioEditorVisibilityToolbarStateController === 'function'
          ? runtimeApi.createStudioEditorVisibilityToolbarStateController(runtimeOptions)
          : null;
      }
    };
  }

  return { createStudioEditorVisibilityToolbarStateRuntimeAccessors };
});
