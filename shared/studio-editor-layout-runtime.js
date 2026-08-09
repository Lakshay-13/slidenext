(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorLayoutRuntime = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function createStudioEditorLayoutRuntime(options = {}) {
    const nudgeApi = options.nudgeApi
      && typeof options.nudgeApi.createStudioEditorNudgeController === 'function'
      ? options.nudgeApi
      : null;
    const alignmentApi = options.alignmentApi
      && typeof options.alignmentApi.createStudioEditorAlignmentController === 'function'
      ? options.alignmentApi
      : null;
    const groupApi = options.groupApi
      && typeof options.groupApi.createStudioEditorGroupController === 'function'
      ? options.groupApi
      : null;

    const nudgeController = nudgeApi
      ? nudgeApi.createStudioEditorNudgeController({
          nudgeApi: options.nudgeEngineApi,
          canonicalLayoutApi: options.canonicalLayoutApi,
          canonicalDeckApi: options.canonicalDeckApi,
          buildMotionSelectionActionState: options.buildMotionSelectionActionState,
          updateMotionActionState: options.updateMotionActionState,
          assignElementId: options.assignElementId,
          buildCanonicalDeckBaseline: options.buildCanonicalDeckBaseline,
          getCanonicalDeckBaseline: options.getCanonicalDeckBaseline,
          applyPositionLayout: options.applyPositionLayout,
          finalizeDeckMutation: options.finalizeDeckMutation
        })
      : null;
    const alignmentController = alignmentApi
      ? alignmentApi.createStudioEditorAlignmentController({
          alignmentApi: options.alignmentEngineApi,
          canonicalLayoutApi: options.canonicalLayoutApi,
          canonicalDeckApi: options.canonicalDeckApi,
          buildAlignmentActionState: options.buildAlignmentActionState,
          updateAlignmentActionState: options.updateAlignmentActionState,
          getIframeDoc: options.getIframeDoc,
          assignElementId: options.assignElementId,
          buildCanonicalDeckBaseline: options.buildCanonicalDeckBaseline,
          getCanonicalDeckBaseline: options.getCanonicalDeckBaseline,
          applyPositionLayout: options.applyPositionLayout,
          finalizeDeckMutation: options.finalizeDeckMutation
        })
      : null;
    const groupController = groupApi
      ? groupApi.createStudioEditorGroupController({
          canonicalDeckApi: options.canonicalDeckApi,
          canonicalGroupApi: options.canonicalGroupApi,
          buildCanonicalDeckBaseline: options.buildCanonicalDeckBaseline,
          getCanonicalDeckBaseline: options.getCanonicalDeckBaseline,
          deckImportApi: options.deckImportApi,
          buildGroupSelectionActionState: options.buildGroupSelectionActionState,
          buildUngroupSelectionActionState: options.buildUngroupSelectionActionState,
          updateGroupActionState: options.updateGroupActionState,
          getIframeDoc: options.getIframeDoc,
          getSlideMetrics: options.getSlideMetrics,
          getRectOnSlide: options.getRectOnSlide,
          getNormalizedSlideLayerOrder: options.getNormalizedSlideLayerOrder,
          assignElementId: options.assignElementId,
          getEditorSlideId: options.getEditorSlideId,
          applyGroupMutation: options.applyGroupMutation,
          applyUngroupMutation: options.applyUngroupMutation,
          commitSelectionState: options.commitSelectionState,
          finalizeDeckMutation: options.finalizeDeckMutation,
          prepareGroup: options.prepareGroup
        })
      : null;

    return {
      nudgeController,
      alignmentController,
      groupController
    };
  }

  return {
    createStudioEditorLayoutRuntime
  };
});
