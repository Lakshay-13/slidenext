(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorGroupStateShellComposition = api;
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

  function createStudioEditorGroupStateShellComposition(options = {}) {
    const accessorsApi = resolveApi(
      options,
      'accessorsApi',
      'SlideNextStudioEditorGroupStateAccessors'
    );
    if (!accessorsApi
      || typeof accessorsApi.createStudioEditorGroupStateAccessors !== 'function') {
      return {
        accessors: null,
        runtime: null,
        controller: null
      };
    }

    const runtimeOptions = { ...(options.runtimeOptions || {}) };
    const groupStateApi = resolveApi(
      options,
      'groupStateApi',
      'SlideNextStudioEditorGroupState',
      runtimeOptions
    );
    runtimeOptions.groupApi = resolveApi(
      options,
      'groupApi',
      'SlideNextStudioEditorGroup',
      runtimeOptions
    );

    const accessors = accessorsApi.createStudioEditorGroupStateAccessors({
      runtimeApi: resolveApi(
        options,
        'runtimeApi',
        'SlideNextStudioEditorGroupStateShellRuntime'
      ),
      groupStateApi,
      runtimeOptions
    });
    const runtime = accessors && accessors.runtime ? accessors.runtime : null;

    return {
      accessors,
      runtime,
      controller: runtime && runtime.isAvailable === true
        ? runtime.groupStateController
        : null
    };
  }

  return {
    createStudioEditorGroupStateShellComposition
  };
});
