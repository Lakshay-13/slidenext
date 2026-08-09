(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorThemeRuntime = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function createStudioEditorThemeRuntime(options = {}) {
    const controllerApi = options.controllerApi
      || (root && root.SlideNextStudioEditorThemeController)
      || null;
    const themeController = controllerApi
      && typeof controllerApi.createStudioEditorThemeController === 'function'
      ? controllerApi.createStudioEditorThemeController({
          themeViewApi: options.themeViewApi
            || (root && root.SlideNextStudioThemeView)
            || null,
          documentRef: options.documentRef,
          localStorageRef: options.localStorageRef,
          getIframeDocument: options.getIframeDocument,
          resolveDarkMode: options.resolveDarkMode
        })
      : null;

    return {
      themeController
    };
  }

  return {
    createStudioEditorThemeRuntime
  };
});
