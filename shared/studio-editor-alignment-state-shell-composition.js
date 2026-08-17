(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorAlignmentStateShellComposition = api;
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

  function createStudioEditorAlignmentStateShellComposition(options = {}) {
    const accessorsApi = resolveApi(
      options,
      'accessorsApi',
      'SlideNextStudioEditorAlignmentStateAccessors'
    );
    if (!accessorsApi
      || typeof accessorsApi.createStudioEditorAlignmentStateAccessors !== 'function') {
      return {
        accessors: null,
        runtime: null,
        controller: null
      };
    }

    const runtimeOptions = { ...(options.runtimeOptions || {}) };
    const alignmentStateApi = resolveApi(
      options,
      'alignmentStateApi',
      'SlideNextStudioEditorAlignmentState',
      runtimeOptions
    );
    runtimeOptions.alignmentApi = resolveApi(
      options,
      'alignmentApi',
      'SlideNextStudioEditorAlignment',
      runtimeOptions
    );

    const accessors = accessorsApi.createStudioEditorAlignmentStateAccessors({
      runtimeApi: resolveApi(
        options,
        'runtimeApi',
        'SlideNextStudioEditorAlignmentStateShellRuntime'
      ),
      alignmentStateApi,
      runtimeOptions
    });
    const runtime = accessors && accessors.runtime ? accessors.runtime : null;

    return {
      accessors,
      runtime,
      controller: runtime && runtime.isAvailable === true
        ? runtime.alignmentStateController
        : null
    };
  }

  return {
    createStudioEditorAlignmentStateShellComposition
  };
});
