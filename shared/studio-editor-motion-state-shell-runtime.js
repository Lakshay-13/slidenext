(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorMotionStateShellRuntime = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function resolveApi(options, optionName, globalName) {
    if (Object.prototype.hasOwnProperty.call(options, optionName)) {
      return options[optionName];
    }
    return root && root[globalName] ? root[globalName] : null;
  }

  function createStudioEditorMotionStateShellRuntime(options = {}) {
    const motionStateApi = resolveApi(
      options,
      'motionStateApi',
      'SlideNextStudioEditorMotionState'
    );
    const controller = motionStateApi
      && typeof motionStateApi.createStudioEditorMotionStateController === 'function'
      ? motionStateApi.createStudioEditorMotionStateController({
          nudgeApi: options.nudgeApi,
          getDocument: options.getDocument,
          getSelectedElements: options.getSelectedElements,
          getActiveSlide: options.getActiveSlide,
          getNudgeSelectionState: options.getNudgeSelectionState,
          getSlideMetrics: options.getSlideMetrics,
          buildPositionedLayoutItems: options.buildPositionedLayoutItems,
          getClosestPositionedAncestor: options.getClosestPositionedAncestor,
          getRectOnSlide: options.getRectOnSlide,
          getActionState: options.getActionState,
          documentRef: options.documentRef
        })
      : null;

    return {
      isAvailable: !!controller,
      motionStateController: controller
    };
  }

  return {
    createStudioEditorMotionStateShellRuntime
  };
});
