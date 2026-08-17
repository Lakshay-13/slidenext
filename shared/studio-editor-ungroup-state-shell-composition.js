(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorUngroupStateShellComposition = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function hasOwn(object, key) {
    return Object.prototype.hasOwnProperty.call(object, key);
  }

  function resolveApi(options, optionName, globalName, fallbackOptions = null) {
    if (hasOwn(options, optionName)) {
      return options[optionName];
    }
    if (fallbackOptions && hasOwn(fallbackOptions, optionName)) {
      return fallbackOptions[optionName];
    }
    return root && root[globalName] ? root[globalName] : null;
  }

  function createStudioEditorUngroupStateShellComposition(options = {}) {
    const accessorsApi = resolveApi(
      options,
      'accessorsApi',
      'SlideNextStudioEditorUngroupStateAccessors'
    );
    if (!accessorsApi
      || typeof accessorsApi.createStudioEditorUngroupStateAccessors !== 'function') {
      return {
        accessors: null,
        runtime: null,
        controller: null
      };
    }

    const runtimeOptions = { ...(options.runtimeOptions || {}) };
    const ungroupStateApi = resolveApi(
      options,
      'ungroupStateApi',
      'SlideNextStudioEditorUngroupState',
      runtimeOptions
    );
    runtimeOptions.groupApi = resolveApi(
      options,
      'groupApi',
      'SlideNextStudioEditorGroup',
      runtimeOptions
    );

    const accessors = accessorsApi.createStudioEditorUngroupStateAccessors({
      runtimeApi: resolveApi(
        options,
        'runtimeApi',
        'SlideNextStudioEditorUngroupStateShellRuntime'
      ),
      ungroupStateApi,
      runtimeOptions
    });
    const runtime = accessors && accessors.runtime ? accessors.runtime : null;

    return {
      accessors,
      runtime,
      controller: runtime && runtime.isAvailable === true
        ? runtime.ungroupStateController
        : null
    };
  }

  return {
    createStudioEditorUngroupStateShellComposition
  };
});
