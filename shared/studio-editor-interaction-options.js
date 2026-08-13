(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorInteractionOptions = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const DEFAULT_DRAG_START_THRESHOLD_PX = 4;
  const DEFAULT_SNAP_THRESHOLD_PX = 12;
  const DEFAULT_MIN_ELEMENT_SIZE_PX = 24;
  const DEFAULT_DRAG_OVERFLOW_MARGIN_PX = 280;

  function buildStudioTransformInteractionOptions(options = {}, overrides = {}) {
    const transformApi = options.transformApi && typeof options.transformApi === 'object'
      ? options.transformApi
      : null;
    const getSlideEditableElements = typeof options.getSlideEditableElements === 'function'
      ? options.getSlideEditableElements
      : () => [];
    const isHidden = typeof options.isHidden === 'function'
      ? options.isHidden
      : () => false;
    const getRectOnSlide = typeof options.getRectOnSlide === 'function'
      ? options.getRectOnSlide
      : () => null;
    const buildTransformSnapTargets = transformApi
      && typeof transformApi.buildStudioTransformSnapTargets === 'function'
      ? transformApi.buildStudioTransformSnapTargets
      : null;

    return {
      getActiveSlide: options.getActiveSlide,
      getSelectionState: options.getSelectionState,
      selectElement: options.selectElement,
      resolveEditableTarget: options.resolveEditableTarget,
      getSlideMetrics: options.getSlideMetrics,
      getPointerOnSlide: options.getPointerOnSlide,
      getSelectionBounds: options.getSelectionBounds,
      getSnapTargets: (slide, selection, slideMetrics) => {
        if (buildTransformSnapTargets) {
          return buildTransformSnapTargets(slide, selection, {
            slideMetrics,
            getSlideEditableElements,
            isHidden,
            getRectOnSlide
          });
        }
        const selectedSet = new Set(Array.isArray(selection) ? selection : []);
        return getSlideEditableElements(slide)
          .filter((element) => !selectedSet.has(element) && !isHidden(element))
          .map((element) => getRectOnSlide(element.getBoundingClientRect(), slideMetrics))
          .filter((bounds) => bounds
            && Number.isFinite(bounds.left)
            && Number.isFinite(bounds.top)
            && Number.isFinite(bounds.right)
            && Number.isFinite(bounds.bottom));
      },
      ensureOverlay: options.ensureOverlay,
      itemOptions: options.itemOptions,
      captureTarget: options.captureTarget,
      dragStartThresholdPx: options.dragStartThresholdPx,
      minSizePx: options.minSizePx,
      dragOverflowMarginPx: options.dragOverflowMarginPx,
      snapDistancePx: options.snapDistancePx,
      snapEnabled: options.snapEnabled,
      getGridSizePx: options.getGridSizePx,
      onSessionStart: options.onSessionStart,
      onSessionFrame: options.onSessionFrame,
      onSessionFinalize: options.onSessionFinalize,
      ...overrides
    };
  }

  function buildStudioMarqueeInteractionOptions(options = {}, overrides = {}) {
    const selectionBoundsApi = options.selectionBoundsApi && typeof options.selectionBoundsApi === 'object'
      ? options.selectionBoundsApi
      : null;
    const getStudioMarqueeSelection = selectionBoundsApi
      && typeof selectionBoundsApi.getStudioMarqueeSelection === 'function'
      ? selectionBoundsApi.getStudioMarqueeSelection
      : null;
    const isHidden = typeof options.isHidden === 'function'
      ? options.isHidden
      : () => false;
    const getRectOnSlide = typeof options.getRectOnSlide === 'function'
      ? options.getRectOnSlide
      : () => null;

    return {
      getActiveSlide: options.getActiveSlide,
      resolveEditableTarget: options.resolveEditableTarget,
      shouldIgnoreTarget: (target) => !!(target && (target.closest('.editor-resize-handle') || target.closest('#editorSelectionOverlay'))),
      getSlideMetrics: options.getSlideMetrics,
      getPointerOnSlide: options.getPointerOnSlide,
      getMarqueeElements: options.getMarqueeElements,
      getMarqueeSelection: (elements, rect, session) => getStudioMarqueeSelection
        ? getStudioMarqueeSelection(elements, rect, {
            isHidden,
            getElementBounds: (element) => getRectOnSlide(element.getBoundingClientRect(), session.slideMetrics)
          })
        : [],
      getSelectedElements: options.getSelectedElements,
      captureTarget: options.captureTarget,
      dragStartThresholdPx: options.dragStartThresholdPx,
      onSessionStart: options.onSessionStart,
      onSessionFrame: options.onSessionFrame,
      onSelectionSessionFinalize: options.onSelectionSessionFinalize,
      commitSelectionState: options.commitSelectionState,
      syncSelectionOverlay: options.syncSelectionOverlay,
      setSuppressNextFrameClick: options.setSuppressNextFrameClick,
      ...overrides
    };
  }

  return {
    DEFAULT_DRAG_START_THRESHOLD_PX,
    DEFAULT_SNAP_THRESHOLD_PX,
    DEFAULT_MIN_ELEMENT_SIZE_PX,
    DEFAULT_DRAG_OVERFLOW_MARGIN_PX,
    buildStudioTransformInteractionOptions,
    buildStudioMarqueeInteractionOptions
  };
});
