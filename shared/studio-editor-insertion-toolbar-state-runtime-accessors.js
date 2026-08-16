(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorInsertionToolbarStateRuntimeAccessors = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function createStudioEditorInsertionToolbarStateRuntimeAccessors(options = {}) {
    const runtimeApi = Object.prototype.hasOwnProperty.call(options, 'runtimeApi')
      ? options.runtimeApi
      : root && root.SlideNextStudioEditorInsertionToolbarState;

    return {
      createStudioEditorInsertionToolbarStateController(runtimeOptions = {}) {
        return runtimeApi
          && typeof runtimeApi.createStudioEditorInsertionToolbarStateController === 'function'
          ? runtimeApi.createStudioEditorInsertionToolbarStateController(runtimeOptions)
          : null;
      }
    };
  }

  return { createStudioEditorInsertionToolbarStateRuntimeAccessors };
});
