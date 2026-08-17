(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorElementSnapshotShellComposition = api;
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

  function resolveSelectionReader(options) {
    if (typeof options.isSelectedElement === 'function') {
      return options.isSelectedElement;
    }

    const liveSelectionApi = resolveApi(
      options,
      'liveSelectionApi',
      'SlideNextStudioEditorLiveSelection'
    );
    const getSelectedElements = typeof options.getSelectedElements === 'function'
      ? options.getSelectedElements
      : () => [];
    const isLiveSelectedElement = liveSelectionApi
      && typeof liveSelectionApi.isStudioLiveSelectedElement === 'function'
      ? liveSelectionApi.isStudioLiveSelectedElement
      : null;

    return isLiveSelectedElement
      ? (candidate) => isLiveSelectedElement(
          getSelectedElements(candidate && candidate.ownerDocument),
          candidate
        )
      : () => false;
  }

  function createStudioEditorElementSnapshotShellComposition(options = {}) {
    const runtimeAccessorsApi = resolveApi(
      options,
      'runtimeAccessorsApi',
      'SlideNextStudioEditorElementSnapshotRuntimeAccessors'
    );
    const accessorsApi = resolveApi(
      options,
      'accessorsApi',
      'SlideNextStudioEditorElementSnapshotAccessors'
    );
    const baseRuntimeOptions = { ...(options.runtimeOptions || {}) };
    const runtimeOptions = {
      ...baseRuntimeOptions,
      snapshotApi: hasOwn(options, 'snapshotApi')
        ? options.snapshotApi
        : hasOwn(baseRuntimeOptions, 'snapshotApi')
          ? baseRuntimeOptions.snapshotApi
          : resolveApi(options, 'snapshotApi', 'SlideNextStudioElementSnapshot'),
      getElementId: hasOwn(options, 'getElementId')
        ? options.getElementId
        : baseRuntimeOptions.getElementId,
      isElementLocked: hasOwn(options, 'isElementLocked')
        ? options.isElementLocked
        : baseRuntimeOptions.isElementLocked,
      isElementHidden: hasOwn(options, 'isElementHidden')
        ? options.isElementHidden
        : baseRuntimeOptions.isElementHidden,
      isSelectedElement: resolveSelectionReader({
        ...baseRuntimeOptions,
        ...options
      })
    };
    const runtimeAccessors = runtimeAccessorsApi
      && typeof runtimeAccessorsApi.createStudioEditorElementSnapshotRuntimeAccessors
        === 'function'
      ? runtimeAccessorsApi.createStudioEditorElementSnapshotRuntimeAccessors({
          runtimeApi: resolveApi(
            options,
            'runtimeApi',
            'SlideNextStudioEditorElementSnapshotShellRuntime'
          ),
          snapshotControllerApi: resolveApi(
            options,
            'snapshotControllerApi',
            'SlideNextStudioEditorElementSnapshotController'
          ),
          runtimeOptions
        })
      : null;
    const shellRuntime = runtimeAccessors
      ? runtimeAccessors.runtime
      : null;
    const controller = shellRuntime && shellRuntime.isAvailable === true
      ? shellRuntime.elementSnapshotController
      : null;
    const accessors = accessorsApi
      && typeof accessorsApi.createStudioEditorElementSnapshotAccessors === 'function'
      ? accessorsApi.createStudioEditorElementSnapshotAccessors({
          controller,
          ...runtimeOptions
        })
      : null;

    return {
      runtimeAccessors,
      shellRuntime,
      controller,
      accessors
    };
  }

  return {
    createStudioEditorElementSnapshotShellComposition
  };
});
