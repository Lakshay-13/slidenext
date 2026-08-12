(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorSessionShellRuntime = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function resolveApi(options, optionName, globalName) {
    if (Object.prototype.hasOwnProperty.call(options, optionName)) {
      return options[optionName];
    }
    return root && root[globalName] ? root[globalName] : null;
  }

  function createStudioEditorSessionShellRuntime(options = {}) {
    const sessionRuntimeApi = resolveApi(
      options,
      'sessionRuntimeApi',
      'SlideNextStudioEditorSessionRuntime'
    );
    if (!sessionRuntimeApi
      || typeof sessionRuntimeApi.createStudioEditorSessionRuntime !== 'function') {
      return null;
    }

    return sessionRuntimeApi.createStudioEditorSessionRuntime(options.runtimeOptions || {});
  }

  return {
    createStudioEditorSessionShellRuntime
  };
});
