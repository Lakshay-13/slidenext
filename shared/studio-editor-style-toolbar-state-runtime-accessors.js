(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorStyleToolbarStateRuntimeAccessors = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function createStudioEditorStyleToolbarStateRuntimeAccessors(options = {}) {
    const runtimeApi = Object.prototype.hasOwnProperty.call(options, 'runtimeApi')
      ? options.runtimeApi
      : root && root.SlideNextStudioEditorStyleToolbarState;

    return {
      createStudioEditorStyleToolbarStateController(runtimeOptions = {}) {
        return runtimeApi
          && typeof runtimeApi.createStudioEditorStyleToolbarStateController === 'function'
          ? runtimeApi.createStudioEditorStyleToolbarStateController(runtimeOptions)
          : null;
      }
    };
  }

  return { createStudioEditorStyleToolbarStateRuntimeAccessors };
});
