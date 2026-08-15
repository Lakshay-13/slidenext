(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorVersionHistoryShellRuntime = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function resolveApi(options, optionName, globalName) {
    if (Object.prototype.hasOwnProperty.call(options, optionName)) {
      return options[optionName];
    }
    return root && root[globalName] ? root[globalName] : null;
  }

  function createStudioEditorVersionHistoryShellRuntime(options = {}) {
    const versionHistoryControllerApi = resolveApi(
      options,
      'versionHistoryControllerApi',
      'SlideNextStudioEditorVersionHistoryController'
    );
    const controller = versionHistoryControllerApi
      && typeof versionHistoryControllerApi.createStudioEditorVersionHistoryController === 'function'
      ? versionHistoryControllerApi.createStudioEditorVersionHistoryController({
          versionHistoryApi: options.versionHistoryApi,
          getPresentationUrl: options.getPresentationUrl,
          getSessionToken: options.getSessionToken,
          createLoadOptions: options.createLoadOptions,
          loadVersionHistory: options.loadVersionHistory,
          beforeLoad: options.beforeLoad,
          reportLoadError: options.reportLoadError
        })
      : null;

    return {
      isAvailable: !!controller,
      versionHistoryController: controller
    };
  }

  return {
    createStudioEditorVersionHistoryShellRuntime
  };
});
