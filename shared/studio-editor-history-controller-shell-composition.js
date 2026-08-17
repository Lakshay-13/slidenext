(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorHistoryControllerShellComposition = api;
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

  function createStudioEditorHistoryControllerShellComposition(options = {}) {
    const accessorsApi = resolveApi(
      options,
      'accessorsApi',
      'SlideNextStudioEditorHistoryControllerRuntimeAccessors'
    );
    if (!accessorsApi
      || typeof accessorsApi.createStudioEditorHistoryControllerRuntimeAccessors !== 'function') {
      return {
        accessors: null,
        runtime: null
      };
    }

    const accessors = accessorsApi.createStudioEditorHistoryControllerRuntimeAccessors({
      runtimeApi: resolveApi(
        options,
        'runtimeApi',
        'SlideNextStudioEditorHistoryControllerShellRuntime'
      ),
      historyRuntimeApi: resolveApi(
        options,
        'historyRuntimeApi',
        'SlideNextStudioEditorHistoryControllerRuntime'
      ),
      runtimeOptions: { ...(options.runtimeOptions || {}) }
    });

    return {
      accessors,
      runtime: accessors && accessors.runtime ? accessors.runtime : null
    };
  }

  return {
    createStudioEditorHistoryControllerShellComposition
  };
});
