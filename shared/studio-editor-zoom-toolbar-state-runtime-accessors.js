(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorZoomToolbarStateRuntimeAccessors = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function createStudioEditorZoomToolbarStateRuntimeAccessors(options = {}) {
    const runtimeApi = Object.prototype.hasOwnProperty.call(options, 'runtimeApi')
      ? options.runtimeApi
      : root && root.SlideNextStudioEditorZoomToolbarState;

    return {
      createStudioEditorZoomToolbarStateController(runtimeOptions = {}) {
        return runtimeApi
          && typeof runtimeApi.createStudioEditorZoomToolbarStateController === 'function'
          ? runtimeApi.createStudioEditorZoomToolbarStateController(runtimeOptions)
          : null;
      }
    };
  }

  return { createStudioEditorZoomToolbarStateRuntimeAccessors };
});
