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
    const conversionApi = options.conversionApi
      && typeof options.conversionApi.createStudioEditorLayoutConversionController === 'function'
      ? options.conversionApi
      : null;
    const layoutModeControllerApi = options.layoutModeControllerApi
      && typeof options.layoutModeControllerApi.createStudioEditorLayoutModeController === 'function'
      ? options.layoutModeControllerApi
      : null;
    const positionLayoutTransactionApi = options.positionLayoutTransactionApi
      && typeof options.positionLayoutTransactionApi.createStudioEditorPositionLayoutApplicator === 'function'
      ? options.positionLayoutTransactionApi
      : null;
    const applyPositionLayout = positionLayoutTransactionApi
      ? positionLayoutTransactionApi.createStudioEditorPositionLayoutApplicator({
          mutationApi: options.positionLayoutMutationApi,
          transactionApi: options.transactionApi,
          alignmentApi: options.alignmentEngineApi,
          legacyApplyPositionLayout: options.applyPositionLayout
        })
      : typeof options.applyPositionLayout === 'function'
        ? options.applyPositionLayout
        : () => ({ didApply: false, transaction: null });

    const nudgeController = nudgeApi
      ? nudgeApi.createStudioEditorNudgeController({
          nudgeApi: options.nudgeEngineApi,
          canonicalLayoutApi: options.canonicalLayoutApi,
          canonicalDeckApi: options.canonicalDeckApi,
          buildMotionSelectionActionState: options.buildMotionSelectionActionState,
          updateMotionActionState: options.updateMotionActionState,
          assignElementId: options.assignElementId,
          buildCanonicalDeckBaseline: options.buildCanonicalDeckBaseline,
          getPendingCanonicalDeck: options.getPendingCanonicalDeck,
          getCanonicalDeckBaseline: options.getCanonicalDeckBaseline,
          applyPositionLayout,
          rollbackPositionMutation: options.rollbackPositionMutation,
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
          getPendingCanonicalDeck: options.getPendingCanonicalDeck,
          getCanonicalDeckBaseline: options.getCanonicalDeckBaseline,
          applyPositionLayout,
          rollbackPositionMutation: options.rollbackPositionMutation,
          finalizeDeckMutation: options.finalizeDeckMutation
        })
      : null;
    const groupController = groupApi
      ? groupApi.createStudioEditorGroupController({
          canonicalDeckApi: options.canonicalDeckApi,
          canonicalGroupApi: options.canonicalGroupApi,
          transactionApi: options.transactionApi,
          groupTransactionApi: options.groupTransactionApi,
          ungroupTransactionApi: options.ungroupTransactionApi,
          groupMutationApi: options.groupMutationApi,
          ungroupMutationApi: options.ungroupMutationApi,
          groupEngineApi: options.groupEngineApi,
          getTransactionElementById: options.getTransactionElementById,
          buildCanonicalDeckBaseline: options.buildCanonicalDeckBaseline,
          getPendingCanonicalDeck: options.getPendingCanonicalDeck,
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
    const conversionController = conversionApi
      ? conversionApi.createStudioEditorLayoutConversionController({
          conversionApi: options.conversionEngineApi,
          canonicalLayoutApi: options.canonicalLayoutApi,
          canonicalDeckApi: options.canonicalDeckApi,
          transactionApi: options.transactionApi,
          getDocument: options.getIframeDoc,
          getSelectedElements: options.getSelectedElements,
          getActiveSlide: options.getActiveSlide,
          getSlideMetrics: options.getSlideMetrics,
          getClosestPositionedAncestor: options.getClosestPositionedAncestor,
          getRectOnSlide: options.getRectOnSlide,
          buildPositionedLayoutItems: options.buildPositionedLayoutItems,
          isLocked: options.isLocked,
          isHidden: options.isHidden,
          isFreeformPositioned: options.isFreeformPositioned,
          assignElementId: options.assignElementId,
          buildCanonicalDeck: options.buildCanonicalDeck,
          buildCanonicalDeckBaseline: options.buildCanonicalDeckBaseline,
          getPendingCanonicalDeck: options.getPendingCanonicalDeck,
          getCanonicalDeckBaseline: options.getCanonicalDeckBaseline,
          finalizeDeckMutation: options.finalizeDeckMutation,
          updateActionState: options.updateConversionActionState
        })
      : null;
    const layoutModeController = layoutModeControllerApi
      ? layoutModeControllerApi.createStudioEditorLayoutModeController({
          layoutModeApi: options.layoutModeApi,
          layoutModeViewApi: options.layoutModeViewApi,
          documentRef: options.documentRef,
          resolveCanonicalDeck: options.resolveCanonicalDeck,
          resolveActiveSlideId: options.resolveActiveSlideId
        })
      : null;

    return {
      nudgeController,
      alignmentController,
      groupController,
      conversionController,
      layoutModeController
    };
  }

  return {
    createStudioEditorLayoutRuntime
  };
});
