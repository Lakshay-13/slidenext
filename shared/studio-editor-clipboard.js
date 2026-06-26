(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorClipboard = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function hasStudioClipboardItems(clipboard) {
    return !!(clipboard && Array.isArray(clipboard.items) && clipboard.items.length > 0);
  }

  function getStudioClipboardSelection(elements = [], options = {}) {
    const selection = Array.isArray(elements) ? elements : [];
    const isEligibleElement = typeof options.isEligibleElement === 'function'
      ? options.isEligibleElement
      : (element) => !!element && (typeof element.isConnected !== 'boolean' || element.isConnected);
    const eligibleSelection = selection.filter((element) => isEligibleElement(element));
    const orderedElements = Array.isArray(options.orderedElements) ? options.orderedElements : null;

    if (!orderedElements) {
      return eligibleSelection;
    }
    return orderedElements.filter((element) => eligibleSelection.includes(element));
  }

  function canStudioCopySelection(elements = [], options = {}) {
    const eligibleSelection = getStudioClipboardSelection(elements, options);

    if (eligibleSelection.length === 0) {
      return false;
    }
    const isLocked = typeof options.isLocked === 'function'
      ? options.isLocked
      : () => false;
    return !eligibleSelection.some((element) => isLocked(element));
  }

  function buildStudioClipboardActionState(elements = [], clipboard = null, options = {}) {
    return buildStudioClipboardMutationPlan(elements, clipboard, options);
  }

  function buildStudioClipboardMutationPlan(elements = [], clipboard = null, options = {}) {
    const selection = getStudioClipboardSelection(elements, options);
    const isLocked = typeof options.isLocked === 'function'
      ? options.isLocked
      : () => false;
    const canCopy = selection.length > 0 && !selection.some((element) => isLocked(element));

    return {
      selection,
      canCopy,
      canDuplicate: canCopy,
      canPaste: hasStudioClipboardItems(clipboard)
    };
  }

  function resolveStudioClipboardInsertionTarget(item = {}, options = {}) {
    const slide = options.slide || null;
    const isConnected = typeof options.isConnected === 'function'
      ? options.isConnected
      : (element) => !!element && (typeof element.isConnected !== 'boolean' || element.isConnected);
    const isOnActiveSlide = typeof options.isOnActiveSlide === 'function'
      ? options.isOnActiveSlide
      : () => false;

    if (item.isAbsolutelyPositioned) {
      const sourceParent = item.sourceParent;
      return {
        mode: 'absolute',
        parent: sourceParent && isConnected(sourceParent) && isOnActiveSlide(sourceParent)
          ? sourceParent
          : slide
      };
    }

    const sourceElement = item.sourceElement;
    if (sourceElement && isConnected(sourceElement) && isOnActiveSlide(sourceElement)) {
      return {
        mode: 'after-source',
        anchor: sourceElement,
        parent: slide
      };
    }

    return {
      mode: 'append-to-slide',
      parent: slide
    };
  }

  function buildStudioClipboardAbsolutePlacement(item = {}, offsetMultiplier = 1, options = {}) {
    const slideWidth = Number.isFinite(options.slideWidth) ? options.slideWidth : 0;
    const slideHeight = Number.isFinite(options.slideHeight) ? options.slideHeight : 0;
    const parentLeft = Number.isFinite(options.parentLeft) ? options.parentLeft : 0;
    const parentTop = Number.isFinite(options.parentTop) ? options.parentTop : 0;
    const offsetPx = Number.isFinite(options.offsetPx) ? options.offsetPx : 0;
    const normalizedOffsetMultiplier = Math.max(1, Number.isFinite(offsetMultiplier) ? offsetMultiplier : 1);
    const width = Number.isFinite(item.width) ? item.width : 0;
    const height = Number.isFinite(item.height) ? item.height : 0;
    const startAbsLeft = Number.isFinite(item.startAbsLeft) ? item.startAbsLeft : 0;
    const startAbsTop = Number.isFinite(item.startAbsTop) ? item.startAbsTop : 0;
    const nextAbsLeft = Math.max(0, Math.min(Math.max(0, slideWidth - width), startAbsLeft + (offsetPx * normalizedOffsetMultiplier)));
    const nextAbsTop = Math.max(0, Math.min(Math.max(0, slideHeight - height), startAbsTop + (offsetPx * normalizedOffsetMultiplier)));

    return {
      nextAbsLeft,
      nextAbsTop,
      nextLeft: nextAbsLeft - parentLeft,
      nextTop: nextAbsTop - parentTop
    };
  }

  return {
    hasStudioClipboardItems,
    getStudioClipboardSelection,
    canStudioCopySelection,
    buildStudioClipboardActionState,
    buildStudioClipboardMutationPlan,
    resolveStudioClipboardInsertionTarget,
    buildStudioClipboardAbsolutePlacement
  };
});
