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

  return {
    getStudioNudgeSelection,
    buildStudioNudgeSelectionState,
    buildStudioNudgeDeltaFromKey,
    buildStudioNudgedLayout
  };
});
