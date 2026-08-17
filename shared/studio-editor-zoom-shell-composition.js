(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorZoomShellComposition = api;
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

  function createStudioEditorZoomShellComposition(options = {}) {
    const runtimeOptionsApi = resolveApi(
      options,
      'runtimeOptionsApi',
      'SlideNextStudioEditorZoomRuntimeOptions'
    );
    const runtimeOptions = runtimeOptionsApi
      && typeof runtimeOptionsApi.createStudioEditorZoomRuntimeOptions === 'function'
      ? runtimeOptionsApi.createStudioEditorZoomRuntimeOptions({
          documentRef: options.documentRef,
          localStorageRef: options.localStorageRef,
          initialZoomFactor: options.initialZoomFactor,
          resolveActionState: options.resolveActionState
        })
      : null;
    const runtimeAccessorsApi = resolveApi(
      options,
      'runtimeAccessorsApi',
      'SlideNextStudioEditorZoomRuntimeAccessors'
    );
    const runtimeAccessors = runtimeAccessorsApi
      && typeof runtimeAccessorsApi.createStudioEditorZoomRuntimeAccessors === 'function'
      ? runtimeAccessorsApi.createStudioEditorZoomRuntimeAccessors({
          runtimeApi: resolveApi(
            options,
            'runtimeApi',
            'SlideNextStudioEditorZoomShellRuntime'
          ),
          zoomRuntimeApi: resolveApi(
            options,
            'zoomRuntimeApi',
            'SlideNextStudioEditorZoomRuntime'
          ),
          runtimeOptions
        })
      : null;
    const runtime = runtimeAccessors ? runtimeAccessors.runtime : null;
    const zoomController = runtime ? runtime.zoomController : null;
    const accessorsApi = resolveApi(
      options,
      'accessorsApi',
      'SlideNextStudioEditorZoomAccessors'
    );
    const accessors = accessorsApi
      && typeof accessorsApi.createStudioEditorZoomAccessors === 'function'
      ? accessorsApi.createStudioEditorZoomAccessors({ zoomController })
      : null;
    if (accessors
      && typeof accessors.bindStudioEditorZoomControls === 'function') {
      accessors.bindStudioEditorZoomControls({ documentRef: options.documentRef });
    }
    const globalAccessors = accessors || (
      accessorsApi
      && typeof accessorsApi.createStudioEditorZoomAccessors === 'function'
        ? accessorsApi.createStudioEditorZoomAccessors({ zoomController })
        : null
    );
    const globalApi = accessorsApi
      && typeof accessorsApi.createStudioEditorZoomGlobalApi === 'function'
      ? accessorsApi.createStudioEditorZoomGlobalApi({ accessors: globalAccessors })
      : {};

    return {
      runtimeOptions,
      runtimeAccessors,
      runtime,
      zoomController,
      accessors,
      globalApi
    };
  }

  return {
    createStudioEditorZoomShellComposition
  };
});
