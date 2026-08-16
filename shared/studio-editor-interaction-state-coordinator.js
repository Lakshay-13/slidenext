(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorInteractionStateCoordinator = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function resolveApi(value, globalName) {
    return value && typeof value === 'object'
      ? value
      : root && root[globalName] && typeof root[globalName] === 'object'
        ? root[globalName]
        : null;
  }

  function createStudioEditorInteractionStateCoordinator(options = {}) {
    const motionStateController = options.motionStateController || null;
    const alignmentStateController = options.alignmentStateController || null;
    const groupStateController = options.groupStateController || null;
    const ungroupStateController = options.ungroupStateController || null;
    const layerOrderStateController = options.layerOrderStateController || null;
    const groupApi = resolveApi(options.groupApi, 'SlideNextStudioEditorGroup');
    const layerController = resolveApi(
      options.layerController,
      'SlideNextStudioEditorLayerController'
    );
    const layerOrderApi = resolveApi(
      options.layerOrderApi,
      'SlideNextStudioEditorLayerOrder'
    );
    const styleApi = resolveApi(options.styleApi, 'SlideNextStudioEditorStyle');
    const getDocument = typeof options.getDocument === 'function'
      ? options.getDocument
      : () => null;
    const getSelectedElements = typeof options.getSelectedElements === 'function'
      ? options.getSelectedElements
      : () => [];
    const getActiveSlide = typeof options.getActiveSlide === 'function'
      ? options.getActiveSlide
      : () => null;
    const getNormalizedSlideLayerOrder = typeof options.getNormalizedSlideLayerOrder === 'function'
      ? options.getNormalizedSlideLayerOrder
      : () => [];
    const getLockedState = typeof options.getLockedState === 'function'
      ? options.getLockedState
      : () => () => false;
    const buildMotionFallback = typeof options.buildMotionActionState === 'function'
      ? options.buildMotionActionState
      : () => ({ selection: [], canNudge: false });
    const buildAlignmentFallback = typeof options.buildAlignmentActionState === 'function'
      ? options.buildAlignmentActionState
      : () => ({ ...buildMotionFallback(), alignmentActionState: { selection: [], canAlign: false } });
    const buildGroupFallback = typeof options.buildGroupActionState === 'function'
      ? options.buildGroupActionState
      : () => ({ canGroup: false });
    const buildUngroupFallback = typeof options.buildUngroupActionState === 'function'
      ? options.buildUngroupActionState
      : () => ({ canUngroup: false });
    const buildLayerOrderFallback = typeof options.buildLayerOrderSelectionActionState === 'function'
      ? options.buildLayerOrderSelectionActionState
      : () => ({ canReorder: false });
    const documentRef = options.documentRef && typeof options.documentRef === 'object'
      ? options.documentRef
      : null;
    let groupSync = null;

    function buildMotionActionState(doc = null) {
      if (motionStateController
        && typeof motionStateController.buildActionState === 'function') {
        return motionStateController.buildActionState(doc);
      }
      return buildMotionFallback(doc);
    }

    function syncMotion(doc = getDocument()) {
      return motionStateController && typeof motionStateController.sync === 'function'
        ? motionStateController.sync(doc)
        : false;
    }

    function buildAlignmentActionState(doc = null) {
      if (alignmentStateController
        && typeof alignmentStateController.buildActionState === 'function') {
        return alignmentStateController.buildActionState(doc);
      }
      return buildAlignmentFallback(doc);
    }

    function syncAlignment(doc = getDocument()) {
      return alignmentStateController && typeof alignmentStateController.sync === 'function'
        ? alignmentStateController.sync(doc)
        : false;
    }

    function buildGroupActionState(doc = null) {
      if (groupStateController
        && typeof groupStateController.buildActionState === 'function') {
        return groupStateController.buildActionState(doc);
      }
      return buildGroupFallback(doc);
    }

    function buildUngroupActionState(doc = null) {
      if (ungroupStateController
        && typeof ungroupStateController.buildActionState === 'function') {
        return ungroupStateController.buildActionState(doc);
      }
      return buildUngroupFallback(doc);
    }

    function syncGroup(doc = getDocument()) {
      if (!groupApi || typeof groupApi.syncStudioGroupToolbarState !== 'function') {
        return false;
      }
      if (typeof groupApi.createStudioGroupToolbarStateSync === 'function') {
        if (!groupSync) {
          groupSync = groupApi.createStudioGroupToolbarStateSync({
            getDocument,
            getGroupActionState: buildGroupActionState,
            getUngroupActionState: buildUngroupActionState,
            getDocumentRef: () => documentRef
          });
        }
        if (typeof groupSync === 'function') return groupSync(doc);
      }
      const groupState = buildGroupActionState(doc);
      const ungroupState = buildUngroupActionState(doc);
      return groupApi.syncStudioGroupToolbarState({
        documentRef,
        canGroup: groupState.canGroup,
        canUngroup: ungroupState.canUngroup
      });
    }

    function buildLayerOrderActionState(elements, options = {}) {
      if (layerOrderStateController
        && typeof layerOrderStateController.buildActionState === 'function') {
        return layerOrderStateController.buildActionState(elements, options);
      }
      return buildLayerOrderFallback(elements, options);
    }

    function syncLayerOrder(doc = getDocument()) {
      const readLockedState = getLockedState(doc);
      if (layerController && typeof layerController.syncStudioLayerOrderActionState === 'function') {
        return layerController.syncStudioLayerOrderActionState({
          documentRef,
          doc,
          selectedElements: getSelectedElements(doc),
          layerOrderApi,
          styleApi,
          getActiveSlide,
          getNormalizedSlideLayerOrder,
          isLocked: readLockedState,
          buildLayerOrderSelectionActionState: buildLayerOrderActionState
        });
      }
      if (!layerOrderApi || typeof layerOrderApi.syncStudioLayerOrderToolbarState !== 'function') {
        return false;
      }
      const buildZIndexMutationPlan = (elements, planOptions = {}) => {
        if (!styleApi || typeof styleApi.buildStudioStyleMutationPlan !== 'function') {
          return { canApply: false };
        }
        return styleApi.buildStudioStyleMutationPlan(elements, 'zIndex', '', planOptions);
      };
      const slide = getActiveSlide(doc);
      const orderedElements = slide ? getNormalizedSlideLayerOrder(slide) : [];
      return layerOrderApi.syncStudioLayerOrderToolbarState({
        documentRef,
        elements: getSelectedElements(doc),
        orderedElements,
        isLocked: readLockedState,
        canMutateDeck: () => !!slide,
        buildZIndexMutationPlan
      });
    }

    return {
      buildMotionActionState,
      syncMotion,
      buildAlignmentActionState,
      syncAlignment,
      buildGroupActionState,
      buildUngroupActionState,
      syncGroup,
      buildLayerOrderActionState,
      syncLayerOrder
    };
  }

  return {
    createStudioEditorInteractionStateCoordinator
  };
});
