(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorNavigationUiShellRuntime = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function resolveApi(options, optionName, globalName) {
    if (Object.prototype.hasOwnProperty.call(options, optionName)) {
      return options[optionName];
    }
    return root && root[globalName] ? root[globalName] : null;
  }

  function createStudioEditorNavigationUiShellRuntime(options = {}) {
    const navigationUiBridgeApi = resolveApi(
      options,
      'navigationUiBridgeApi',
      'SlideNextStudioEditorNavigationUiBridge'
    );
    const bridge = navigationUiBridgeApi
      && typeof navigationUiBridgeApi.createStudioEditorNavigationUiBridge === 'function'
      ? navigationUiBridgeApi.createStudioEditorNavigationUiBridge({
          navigationSync: options.navigationSync,
          thumbnailController: options.thumbnailController
        })
      : null;

    return {
      isAvailable: !!bridge,
      navigationUiBridge: bridge
    };
  }

  return {
    createStudioEditorNavigationUiShellRuntime
  };
});
