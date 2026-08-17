(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorThemeShellComposition = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function hasOwn(object, key) {
    return Object.prototype.hasOwnProperty.call(object, key);
  }

  function resolveApi(options, optionName, globalName) {
    if (hasOwn(options, optionName)) {
      return options[optionName];
    }
    return root && root[globalName] ? root[globalName] : null;
  }

  function createStudioEditorThemeShellComposition(options = {}) {
    const runtimeAccessorsApi = resolveApi(
      options,
      'runtimeAccessorsApi',
      'SlideNextStudioEditorThemeRuntimeAccessors'
    );
    const runtimeAccessors = runtimeAccessorsApi
      && typeof runtimeAccessorsApi.createStudioEditorThemeRuntimeAccessors === 'function'
      ? runtimeAccessorsApi.createStudioEditorThemeRuntimeAccessors({
          runtimeApi: resolveApi(
            options,
            'runtimeApi',
            'SlideNextStudioEditorThemeShellRuntime'
          ),
          themeRuntimeApi: resolveApi(
            options,
            'themeRuntimeApi',
            'SlideNextStudioEditorThemeRuntime'
          ),
          runtimeOptions: {
            controllerApi: resolveApi(
              options,
              'controllerApi',
              'SlideNextStudioEditorThemeController'
            ),
            themeViewApi: resolveApi(
              options,
              'themeViewApi',
              'SlideNextStudioThemeView'
            ),
            documentRef: options.documentRef,
            localStorageRef: options.localStorageRef,
            getIframeDocument: options.getIframeDocument,
            resolveDarkMode: options.resolveDarkMode
          }
        })
      : null;
    const runtime = runtimeAccessors ? runtimeAccessors.runtime : null;
    const themeController = runtime ? runtime.themeController : null;
    if (themeController
      && typeof themeController.bindStudioEditorThemeButtons === 'function') {
      themeController.bindStudioEditorThemeButtons({ documentRef: options.documentRef });
    }

    return {
      runtimeAccessors,
      runtime,
      themeController
    };
  }

  return {
    createStudioEditorThemeShellComposition
  };
});
