(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorAutoVersionShellRuntime = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function resolveApi(options, optionName, globalName) {
    if (Object.prototype.hasOwnProperty.call(options, optionName)) {
      return options[optionName];
    }
    return root && root[globalName] ? root[globalName] : null;
  }

  function createStudioEditorAutoVersionShellRuntime(options = {}) {
    const autoVersionRuntimeApi = resolveApi(
      options,
      'autoVersionRuntimeApi',
      'SlideNextStudioEditorAutoVersionRuntime'
    );
    if (!autoVersionRuntimeApi
      || typeof autoVersionRuntimeApi.createStudioEditorAutoVersionRuntime !== 'function') {
      return null;
    }

    const runtimeOptions = { ...options };
    delete runtimeOptions.autoVersionRuntimeApi;
    runtimeOptions.controllerApi = resolveApi(
      options,
      'controllerApi',
      'SlideNextStudioEditorAutoVersionController'
    );

    return autoVersionRuntimeApi.createStudioEditorAutoVersionRuntime(runtimeOptions);
  }

  return {
    createStudioEditorAutoVersionShellRuntime
  };
});
