(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorMotionStateShellComposition = api;
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

  function createStudioEditorMotionStateShellComposition(options = {}) {
    const accessorsApi = resolveApi(
      options,
      'accessorsApi',
      'SlideNextStudioEditorMotionStateAccessors'
    );
    if (!accessorsApi
      || typeof accessorsApi.createStudioEditorMotionStateAccessors !== 'function') {
      return {
        accessors: null,
        runtime: null,
        controller: null
      };
    }

    const runtimeOptions = { ...(options.runtimeOptions || {}) };
    const motionStateApi = resolveApi(
      options,
      'motionStateApi',
      'SlideNextStudioEditorMotionState',
      runtimeOptions
    );
    runtimeOptions.nudgeApi = resolveApi(
      options,
      'nudgeApi',
      'SlideNextStudioEditorNudge',
      runtimeOptions
    );

    const accessors = accessorsApi.createStudioEditorMotionStateAccessors({
      runtimeApi: resolveApi(
        options,
        'runtimeApi',
        'SlideNextStudioEditorMotionStateShellRuntime'
      ),
      motionStateApi,
      runtimeOptions
    });
    const runtime = accessors && accessors.runtime ? accessors.runtime : null;

    return {
      accessors,
      runtime,
      controller: runtime && runtime.isAvailable === true
        ? runtime.motionStateController
        : null
    };
  }

  return {
    createStudioEditorMotionStateShellComposition
  };
});
