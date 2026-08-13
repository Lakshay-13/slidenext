(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorMotionState = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function createStudioEditorMotionStateController(options = {}) {
    const nudgeApi = options.nudgeApi && typeof options.nudgeApi === 'object'
      ? options.nudgeApi
      : null;
    const getDocument = typeof options.getDocument === 'function'
      ? options.getDocument
      : () => null;
    const getSelectedElements = typeof options.getSelectedElements === 'function'
      ? options.getSelectedElements
      : () => [];
    const getActiveSlide = typeof options.getActiveSlide === 'function'
      ? options.getActiveSlide
      : () => null;
    const getNudgeSelectionState = typeof options.getNudgeSelectionState === 'function'
      ? options.getNudgeSelectionState
      : () => ({ selection: [], canNudge: false });
    const getSlideMetrics = typeof options.getSlideMetrics === 'function'
      ? options.getSlideMetrics
      : () => null;
    const buildPositionedLayoutItems = typeof options.buildPositionedLayoutItems === 'function'
      ? options.buildPositionedLayoutItems
      : () => [];
    const getClosestPositionedAncestor = typeof options.getClosestPositionedAncestor === 'function'
      ? options.getClosestPositionedAncestor
      : () => null;
    const getRectOnSlide = typeof options.getRectOnSlide === 'function'
      ? options.getRectOnSlide
      : () => null;
    const documentRef = options.documentRef && typeof options.documentRef === 'object'
      ? options.documentRef
      : null;
    const injectedActionState = typeof options.getActionState === 'function'
      ? options.getActionState
      : null;
    let actionStateBuilder = null;
    let toolbarStateSync = null;

    function buildLayoutItems(selection, slideMetrics) {
      return buildPositionedLayoutItems(selection, {
        getClosestPositionedAncestor,
        getRectOnSlide,
        slideMetrics
      });
    }

    function buildActionState(doc = getDocument()) {
      if (injectedActionState) return injectedActionState(doc);
      if (nudgeApi && typeof nudgeApi.createStudioNudgeActionStateBuilder === 'function') {
        if (!actionStateBuilder) {
          actionStateBuilder = nudgeApi.createStudioNudgeActionStateBuilder({
            getDocument,
            getActiveSlide,
            getNudgeSelectionState,
            getSlideMetrics,
            buildPositionedLayoutItems: buildLayoutItems
          });
        }
        if (typeof actionStateBuilder === 'function') return actionStateBuilder(doc);
      }

      const resolvedDoc = doc || getDocument();
      const slide = getActiveSlide(resolvedDoc);
      const nudgeSelectionState = getNudgeSelectionState(
        getSelectedElements(resolvedDoc),
        resolvedDoc
      );
      const slideMetrics = slide ? getSlideMetrics(slide) : null;
      if (nudgeApi && typeof nudgeApi.buildStudioNudgeActionState === 'function') {
        return nudgeApi.buildStudioNudgeActionState(nudgeSelectionState, {
          doc: resolvedDoc,
          slide,
          slideMetrics,
          buildPositionedLayoutItems: buildLayoutItems
        });
      }
      return {
        doc: resolvedDoc,
        slide,
        slideMetrics,
        slideBounds: null,
        nudgeSelectionState,
        nudgeLayoutItems: [],
        canResolveNudgeLayout: false,
        canNudge: false
      };
    }

    function sync(doc = getDocument()) {
      if (!nudgeApi || typeof nudgeApi.syncStudioNudgeToolbarState !== 'function') {
        return false;
      }
      if (typeof nudgeApi.createStudioNudgeToolbarStateSync === 'function') {
        if (!toolbarStateSync) {
          toolbarStateSync = nudgeApi.createStudioNudgeToolbarStateSync({
            getDocument,
            getActionState: buildActionState,
            getDocumentRef: () => documentRef
          });
        }
        if (typeof toolbarStateSync === 'function') return toolbarStateSync(doc);
      }
      const actionState = buildActionState(doc);
      return nudgeApi.syncStudioNudgeToolbarState({
        documentRef,
        canNudge: actionState.canNudge
      });
    }

    return {
      buildActionState,
      sync
    };
  }

  return {
    createStudioEditorMotionStateController
  };
});
