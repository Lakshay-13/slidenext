(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorTransformRuntime = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function createStudioEditorTransformRuntime(options = {}) {
    const hasOption = (name) => Object.prototype.hasOwnProperty.call(options, name);
    const resolveApi = (name, globalName) => hasOption(name)
      ? options[name]
      : (root && root[globalName]) || null;
    const controllerApi = resolveApi(
      'controllerApi',
      'SlideNextStudioEditorTransformController'
    );
    const transformController = controllerApi
      && typeof controllerApi.createStudioEditorTransformController === 'function'
      ? controllerApi.createStudioEditorTransformController({
          transformApi: resolveApi('transformApi', 'SlideNextStudioEditorTransform'),
          canonicalTransformApi: resolveApi(
            'canonicalTransformApi',
            'SlideNextStudioEditorCanonicalTransform'
          ),
          canonicalDeckApi: resolveApi('canonicalDeckApi', 'SlideNextCanonicalDeck'),
          transactionApi: resolveApi('transactionApi', 'SlideNextStudioEditorTransaction'),
          domApi: resolveApi('domApi', 'SlideNextStudioEditorDom'),
          interactionOptionsApi: resolveApi(
            'interactionOptionsApi',
            'SlideNextStudioEditorInteractionOptions'
          ),
          interactionsApi: resolveApi('interactionsApi', 'SlideNextStudioEditorInteractions'),
          eventsApi: resolveApi('eventsApi', 'SlideNextStudioEditorEvents'),
          selectionBoundsApi: resolveApi(
            'selectionBoundsApi',
            'SlideNextStudioEditorSelectionBounds'
          ),
          getActiveSlide: options.getActiveSlide,
          getTransformSelectionState: options.getTransformSelectionState,
          selectElement: options.selectElement,
          resolveEditableTarget: options.resolveEditableTarget,
          getSlideMetrics: options.getSlideMetrics,
          getPointerOnSlide: options.getPointerOnSlide,
          getSelectionBounds: options.getSelectionBounds,
          getSlideEditableElements: options.getSlideEditableElements,
          getCanonicalVisibilityReader: options.getCanonicalVisibilityReader,
          getCanonicalFreeformReader: options.getCanonicalFreeformReader,
          isFreeformPositioned: options.isFreeformPositioned,
          isHidden: options.isHidden,
          getRectOnSlide: options.getRectOnSlide,
          ensureOverlay: options.ensureOverlay,
          getClosestPositionedAncestor: options.getClosestPositionedAncestor,
          getSelectedElements: options.getSelectedElements,
          getMarqueeElements: options.getMarqueeElements,
          commitSelectionState: options.commitSelectionState,
          updateDragHud: options.updateDragHud,
          renderGuides: options.renderGuides,
          syncSelectionOverlay: options.syncSelectionOverlay,
          hideGuides: options.hideGuides,
          hideDragHud: options.hideDragHud,
          syncInspectorForSelection: options.syncInspectorForSelection,
          renderMarqueeSelection: options.renderMarqueeSelection,
          clearMarqueeSelection: options.clearMarqueeSelection,
          saveHistoryState: options.saveHistoryState,
          triggerAutoSave: options.triggerAutoSave,
          triggerAutoVersion: options.triggerAutoVersion,
          buildCanonicalDeck: options.buildCanonicalDeck,
          buildCanonicalDeckBaseline: options.buildCanonicalDeckBaseline,
          getCanonicalDeckBaseline: options.getCanonicalDeckBaseline,
          assignElementId: options.assignElementId,
          getGridSizePx: options.getGridSizePx,
          getIsDraggingElement: options.getIsDraggingElement,
          setIsDraggingElement: options.setIsDraggingElement,
          setSuppressNextFrameClick: options.setSuppressNextFrameClick,
          dragStartThresholdPx: options.dragStartThresholdPx,
          minSizePx: options.minSizePx,
          dragOverflowMarginPx: options.dragOverflowMarginPx,
          snapDistancePx: options.snapDistancePx,
          snapEnabled: options.snapEnabled
        })
      : null;

    return {
      transformController
    };
  }

  return {
    createStudioEditorTransformRuntime
  };
});
