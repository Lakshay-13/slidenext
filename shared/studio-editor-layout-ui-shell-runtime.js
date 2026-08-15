(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorLayoutUiShellRuntime = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function resolveApi(options, optionName, globalName) {
    if (Object.prototype.hasOwnProperty.call(options, optionName)) {
      return options[optionName];
    }
    return root && root[globalName] ? root[globalName] : null;
  }

  function createStudioEditorLayoutUiShellRuntime(options = {}) {
    const layoutUiBridgeApi = resolveApi(
      options,
      'layoutUiBridgeApi',
      'SlideNextStudioEditorLayoutUiBridge'
    );
    const bridge = layoutUiBridgeApi
      && typeof layoutUiBridgeApi.createStudioEditorLayoutUiBridge === 'function'
      ? layoutUiBridgeApi.createStudioEditorLayoutUiBridge({
          layoutModeController: options.layoutModeController,
          layoutConversionController: options.layoutConversionController,
          layoutConversionViewApi: resolveApi(
            options,
            'layoutConversionViewApi',
            'SlideNextStudioEditorLayoutConversionView'
          ),
          documentRef: options.documentRef,
          getDocument: options.getDocument
        })
      : null;

    return {
      isAvailable: !!bridge,
      layoutUiBridge: bridge
    };
  }

  return {
    createStudioEditorLayoutUiShellRuntime
  };
});
