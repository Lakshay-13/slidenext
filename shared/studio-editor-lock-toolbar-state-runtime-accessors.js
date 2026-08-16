(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorLockToolbarStateRuntimeAccessors = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function createStudioEditorLockToolbarStateRuntimeAccessors(options = {}) {
    const runtimeApi = Object.prototype.hasOwnProperty.call(options, 'runtimeApi')
      ? options.runtimeApi
      : root && root.SlideNextStudioEditorLockToolbarState;

    return {
      createStudioEditorLockToolbarStateController(runtimeOptions = {}) {
        return runtimeApi
          && typeof runtimeApi.createStudioEditorLockToolbarStateController === 'function'
          ? runtimeApi.createStudioEditorLockToolbarStateController(runtimeOptions)
          : null;
      }
    };
  }

  return { createStudioEditorLockToolbarStateRuntimeAccessors };
});
