(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorThemeToolbarStateRuntimeAccessors = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function createStudioEditorThemeToolbarStateRuntimeAccessors(options = {}) {
    const runtimeApi = Object.prototype.hasOwnProperty.call(options, 'runtimeApi')
      ? options.runtimeApi
      : root && root.SlideNextStudioEditorThemeToolbarState;

    return {
      createStudioEditorThemeToolbarStateController(runtimeOptions = {}) {
        return runtimeApi
          && typeof runtimeApi.createStudioEditorThemeToolbarStateController === 'function'
          ? runtimeApi.createStudioEditorThemeToolbarStateController(runtimeOptions)
          : null;
      }
    };
  }

  return { createStudioEditorThemeToolbarStateRuntimeAccessors };
});
