(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorSourceShellRuntime = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function resolveApi(options, optionName, globalName) {
    if (Object.prototype.hasOwnProperty.call(options, optionName)) {
      return options[optionName];
    }
    return root && root[globalName] ? root[globalName] : null;
  }

  function createStudioEditorSourceShellRuntime(options = {}) {
    const sourceRuntimeApi = resolveApi(
      options,
      'sourceRuntimeApi',
      'SlideNextStudioEditorSourceRuntime'
    );
    if (!sourceRuntimeApi || typeof sourceRuntimeApi.createStudioEditorSourceRuntime !== 'function') {
      return null;
    }

    const runtimeOptions = { ...options };
    delete runtimeOptions.sourceRuntimeApi;
    runtimeOptions.sourceControllerApi = resolveApi(
      options,
      'sourceControllerApi',
      'SlideNextStudioEditorSourceController'
    );
    runtimeOptions.sourceAccessorsApi = resolveApi(
      options,
      'sourceAccessorsApi',
      'SlideNextStudioEditorSourceAccessors'
    );

    return sourceRuntimeApi.createStudioEditorSourceRuntime(runtimeOptions);
  }

  return {
    createStudioEditorSourceShellRuntime
  };
});
