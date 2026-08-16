(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorGroupToolbarStateRuntimeAccessors = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function createStudioEditorGroupToolbarStateRuntimeAccessors(options = {}) {
    const runtimeApi = Object.prototype.hasOwnProperty.call(options, 'runtimeApi')
      ? options.runtimeApi
      : root && root.SlideNextStudioEditorGroupToolbarState;

    return {
      createStudioEditorGroupToolbarStateController(runtimeOptions = {}) {
        return runtimeApi
          && typeof runtimeApi.createStudioEditorGroupToolbarStateController === 'function'
          ? runtimeApi.createStudioEditorGroupToolbarStateController(runtimeOptions)
          : null;
      }
    };
  }

  return { createStudioEditorGroupToolbarStateRuntimeAccessors };
});
