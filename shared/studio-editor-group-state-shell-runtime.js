(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorGroupStateShellRuntime = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function resolveApi(options, optionName, globalName) {
    if (Object.prototype.hasOwnProperty.call(options, optionName)) {
      return options[optionName];
    }
    return root && root[globalName] ? root[globalName] : null;
  }

  function createStudioEditorGroupStateShellRuntime(options = {}) {
    const groupStateApi = resolveApi(
      options,
      'groupStateApi',
      'SlideNextStudioEditorGroupState'
    );
    const controller = groupStateApi
      && typeof groupStateApi.createStudioEditorGroupStateController === 'function'
      ? groupStateApi.createStudioEditorGroupStateController({
          groupApi: options.groupApi,
          getDocument: options.getDocument,
          getSelectedElements: options.getSelectedElements,
          getActiveSlide: options.getActiveSlide,
          getLiveSelectedElements: options.getLiveSelectedElements,
          getSlideMetrics: options.getSlideMetrics,
          buildPositionedLayoutItems: options.buildPositionedLayoutItems,
          getClosestPositionedAncestor: options.getClosestPositionedAncestor,
          getRectOnSlide: options.getRectOnSlide,
          getLockedState: options.getLockedState,
          getFreeformPositioned: options.getFreeformPositioned,
          isFreeformPositioned: options.isFreeformPositioned
        })
      : null;

    return {
      isAvailable: !!controller,
      groupStateController: controller
    };
  }

  return {
    createStudioEditorGroupStateShellRuntime
  };
});
