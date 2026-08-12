(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorGridSnapShellRuntime = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function resolveApi(options, optionName, globalName) {
    if (Object.prototype.hasOwnProperty.call(options, optionName)) {
      return options[optionName];
    }
    return root && root[globalName] ? root[globalName] : null;
  }

  function createStudioEditorGridSnapShellRuntime(options = {}) {
    const gridSnapRuntimeApi = resolveApi(
      options,
      'gridSnapRuntimeApi',
      'SlideNextStudioEditorGridSnapRuntime'
    );
    if (!gridSnapRuntimeApi
      || typeof gridSnapRuntimeApi.createStudioEditorGridSnapRuntime !== 'function') {
      return null;
    }

    const runtimeOptions = { ...options };
    delete runtimeOptions.gridSnapRuntimeApi;
    runtimeOptions.controllerApi = resolveApi(
      options,
      'controllerApi',
      'SlideNextStudioEditorGridSnapController'
    );
    runtimeOptions.gridSnapView = resolveApi(
      options,
      'gridSnapView',
      'SlideNextStudioEditorGridSnapView'
    );

    return gridSnapRuntimeApi.createStudioEditorGridSnapRuntime(runtimeOptions);
  }

  return {
    createStudioEditorGridSnapShellRuntime
  };
});
