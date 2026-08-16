(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorHistoryControllerShellRuntime = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function resolveApi(options, optionName, globalName) {
    if (Object.prototype.hasOwnProperty.call(options, optionName)) {
      return options[optionName];
    }
    return root && root[globalName] ? root[globalName] : null;
  }

  function createStudioEditorHistoryControllerShellRuntime(options = {}) {
    const historyRuntimeApi = resolveApi(
      options,
      'historyRuntimeApi',
      'SlideNextStudioEditorHistoryControllerRuntime'
    );
    if (!historyRuntimeApi
      || typeof historyRuntimeApi.createStudioEditorHistoryControllerRuntime !== 'function') {
      return null;
    }

    const runtimeOptions = Object.prototype.hasOwnProperty.call(options, 'runtimeOptions')
      ? options.runtimeOptions
      : options;
    return historyRuntimeApi.createStudioEditorHistoryControllerRuntime(runtimeOptions || {});
  }

  return {
    createStudioEditorHistoryControllerShellRuntime
  };
});
