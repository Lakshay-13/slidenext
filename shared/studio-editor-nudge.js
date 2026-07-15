(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorNudge = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function getStudioNudgeSelection(elements = [], options = {}) {
    const selection = Array.isArray(elements) ? elements : [];
    const isEligibleElement = typeof options.isEligibleElement === 'function'
      ? options.isEligibleElement
      : (element) => !!element && (typeof element.isConnected !== 'boolean' || element.isConnected);

    return selection.filter((element) => isEligibleElement(element));
  }

  function buildStudioNudgeSelectionState(elements = [], options = {}) {
    const selection = getStudioNudgeSelection(elements, options);
    const isLocked = typeof options.isLocked === 'function'
      ? options.isLocked
      : () => false;
    const isFreeformPositioned = typeof options.isFreeformPositioned === 'function'
      ? options.isFreeformPositioned
      : () => false;

    return {
      selection,
      canNudge: selection.length > 0 && selection.every((element) => {
        return !isLocked(element) && isFreeformPositioned(element);
      })
    };
  }

  function buildStudioNudgeActionState(selectionState = {}, options = {}) {
    const selection = Array.isArray(selectionState.selection) ? selectionState.selection : [];
    const canNudgeSelection = !!selectionState.canNudge;
    const resolvedDoc = options.doc || null;
    const slide = options.slide || null;
    const slideMetrics = options.slideMetrics || null;
    const slideBounds = slideMetrics
      ? {
          width: slideMetrics.logicalWidth,
          height: slideMetrics.logicalHeight
        }
      : null;
    const buildPositionedLayoutItems = typeof options.buildPositionedLayoutItems === 'function'
      ? options.buildPositionedLayoutItems
      : () => [];
    const nudgeLayoutItems = resolvedDoc && slide && canNudgeSelection
      ? buildPositionedLayoutItems(selection, slideMetrics)
      : [];
    const canResolveNudgeLayout = nudgeLayoutItems.length === selection.length
      && nudgeLayoutItems.length > 0;

    return {
      doc: resolvedDoc,
      slide,
      slideMetrics,
      slideBounds,
      nudgeSelectionState: selectionState,
      nudgeLayoutItems,
      canResolveNudgeLayout,
      canNudge: !!(resolvedDoc && slide && canNudgeSelection && canResolveNudgeLayout)
    };
  }

  function renderStudioNudgeToolbarState(options = {}) {
    const documentRef = options.documentRef;
    if (!documentRef || typeof documentRef.getElementById !== 'function') return false;
    const canNudge = !!options.canNudge;
    [
      'nudgeSelectionUpBtn',
      'nudgeSelectionLeftBtn',
      'nudgeSelectionRightBtn',
      'nudgeSelectionDownBtn'
    ].forEach((id) => {
      const button = documentRef.getElementById(id);
      if (button) button.disabled = !canNudge;
    });
    return true;
  }

  function clampStudioNudgeValue(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function buildStudioNudgeDeltaFromKey(key = '', options = {}) {
    const fineStepPx = Number.isFinite(options.fineStepPx) ? options.fineStepPx : 1;
    const coarseStepPx = Number.isFinite(options.coarseStepPx) ? options.coarseStepPx : 10;
    const step = options.shiftKey ? coarseStepPx : fineStepPx;

    if (key === 'ArrowUp') return { dx: 0, dy: -step };
    if (key === 'ArrowDown') return { dx: 0, dy: step };
    if (key === 'ArrowLeft') return { dx: -step, dy: 0 };
    if (key === 'ArrowRight') return { dx: step, dy: 0 };
    return null;
  }

  function buildStudioNudgedLayout(items = [], delta = {}, slideBounds = {}) {
    const layoutItems = Array.isArray(items) ? items : [];
    const dx = Number.isFinite(delta.dx) ? delta.dx : 0;
    const dy = Number.isFinite(delta.dy) ? delta.dy : 0;
    const slideWidth = Number.isFinite(slideBounds.width) ? slideBounds.width : 0;
    const slideHeight = Number.isFinite(slideBounds.height) ? slideBounds.height : 0;
    let didChange = false;

    const nextItems = layoutItems.map((item) => {
      const absLeft = Number.isFinite(item.absLeft) ? item.absLeft : 0;
      const absTop = Number.isFinite(item.absTop) ? item.absTop : 0;
      const width = Number.isFinite(item.width) ? item.width : 0;
      const height = Number.isFinite(item.height) ? item.height : 0;
      const parentLeft = Number.isFinite(item.parentLeft) ? item.parentLeft : 0;
      const parentTop = Number.isFinite(item.parentTop) ? item.parentTop : 0;
      const nextAbsLeft = clampStudioNudgeValue(absLeft + dx, 0, Math.max(0, slideWidth - width));
      const nextAbsTop = clampStudioNudgeValue(absTop + dy, 0, Math.max(0, slideHeight - height));
      if (nextAbsLeft !== absLeft || nextAbsTop !== absTop) {
        didChange = true;
      }
      return {
        ...item,
        nextAbsLeft,
        nextAbsTop,
        nextLeft: nextAbsLeft - parentLeft,
        nextTop: nextAbsTop - parentTop
      };
    });

    return {
      didChange,
      nextItems
    };
  }

  function applyStudioNudgedLayout(items = [], options = {}) {
    const nextItems = Array.isArray(items) ? items : [];
    const createPositionTransaction = typeof options.createPositionTransaction === 'function'
      ? options.createPositionTransaction
      : null;
    const getElementId = typeof options.getElementId === 'function'
      ? options.getElementId
      : (element) => element && element.dataset && element.dataset.editorId;
    const transaction = createPositionTransaction
      ? createPositionTransaction(nextItems, { getElementId })
      : null;
    let didApply = false;
    nextItems.forEach((item) => {
      if (!item || !item.element || !item.element.style) return;
      item.element.style.left = `${item.nextLeft}px`;
      item.element.style.top = `${item.nextTop}px`;
      didApply = true;
    });

    return {
      didApply,
      transaction
    };
  }

  return {
    getStudioNudgeSelection,
    buildStudioNudgeSelectionState,
    buildStudioNudgeActionState,
    renderStudioNudgeToolbarState,
    buildStudioNudgeDeltaFromKey,
    buildStudioNudgedLayout,
    applyStudioNudgedLayout
  };
});
