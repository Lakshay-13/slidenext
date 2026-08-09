(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorSelectionBounds = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function getStudioBoundableSelection(elements = [], options = {}) {
    const selection = Array.isArray(elements) ? elements : [];
    const isEligibleElement = typeof options.isEligibleElement === 'function'
      ? options.isEligibleElement
      : (element) => !!element && (typeof element.isConnected !== 'boolean' || element.isConnected);
    const isHidden = typeof options.isHidden === 'function'
      ? options.isHidden
      : () => false;

    return selection.filter((element) => isEligibleElement(element) && !isHidden(element));
  }

  function normalizeStudioSelectionRect(rect) {
    if (!rect
      || !Number.isFinite(rect.left)
      || !Number.isFinite(rect.top)
      || !Number.isFinite(rect.right)
      || !Number.isFinite(rect.bottom)) {
      return null;
    }

    return {
      left: Math.min(rect.left, rect.right),
      top: Math.min(rect.top, rect.bottom),
      right: Math.max(rect.left, rect.right),
      bottom: Math.max(rect.top, rect.bottom)
    };
  }

  function normalizeStudioSelectionMinSize(value, fallback = 24) {
    return Number.isFinite(value) && value >= 0 ? value : fallback;
  }

  function getStudioMarqueeSelection(elements = [], marqueeRect, options = {}) {
    const normalizedMarqueeRect = normalizeStudioSelectionRect(marqueeRect);
    if (!normalizedMarqueeRect) {
      return [];
    }

    const getElementBounds = typeof options.getElementBounds === 'function'
      ? options.getElementBounds
      : () => null;

    return getStudioBoundableSelection(elements, options).filter((element) => {
      const elementRect = normalizeStudioSelectionRect(getElementBounds(element));
      if (!elementRect) {
        return false;
      }

      return elementRect.left < normalizedMarqueeRect.right
        && elementRect.right > normalizedMarqueeRect.left
        && elementRect.top < normalizedMarqueeRect.bottom
        && elementRect.bottom > normalizedMarqueeRect.top;
    });
  }

  function buildStudioSelectionBounds(elements = [], options = {}) {
    const selection = getStudioBoundableSelection(elements, options);
    if (selection.length === 0) {
      return null;
    }

    const getElementBounds = typeof options.getElementBounds === 'function'
      ? options.getElementBounds
      : () => null;
    const minSizePx = normalizeStudioSelectionMinSize(options.minSizePx);
    const rects = selection
      .map((element) => getElementBounds(element))
      .filter((rect) => rect
        && Number.isFinite(rect.left)
        && Number.isFinite(rect.top)
        && Number.isFinite(rect.right)
        && Number.isFinite(rect.bottom));

    if (rects.length === 0) {
      return null;
    }

    const left = Math.min(...rects.map((rect) => rect.left));
    const top = Math.min(...rects.map((rect) => rect.top));
    const right = Math.max(...rects.map((rect) => rect.right));
    const bottom = Math.max(...rects.map((rect) => rect.bottom));

    return {
      left,
      top,
      right,
      bottom,
      width: Math.max(minSizePx, right - left),
      height: Math.max(minSizePx, bottom - top)
    };
  }

  function createStudioSelectionBoundsResolver(options = {}) {
    const getCurrentDocument = typeof options.getCurrentDocument === 'function'
      ? options.getCurrentDocument
      : () => null;
    const getActiveSlide = typeof options.getActiveSlide === 'function'
      ? options.getActiveSlide
      : () => null;
    const getSelectedElements = typeof options.getSelectedElements === 'function'
      ? options.getSelectedElements
      : () => [];
    const getSlideMetrics = typeof options.getSlideMetrics === 'function'
      ? options.getSlideMetrics
      : () => null;
    const getRectOnSlide = typeof options.getRectOnSlide === 'function'
      ? options.getRectOnSlide
      : (rect) => rect;
    const getHiddenStateReader = typeof options.getHiddenStateReader === 'function'
      ? options.getHiddenStateReader
      : () => null;
    const getMinSizePx = typeof options.getMinSizePx === 'function'
      ? options.getMinSizePx
      : () => options.minSizePx;

    return function resolveStudioSelectionBounds(
      elements = getSelectedElements(),
      slideMetrics = null
    ) {
      const documentRef = getCurrentDocument();
      const slide = getActiveSlide(documentRef);
      if (!slide) return null;

      const metrics = slideMetrics || getSlideMetrics(slide);
      const isHidden = getHiddenStateReader(documentRef);
      return buildStudioSelectionBounds(elements, {
        minSizePx: getMinSizePx(),
        isHidden,
        getElementBounds: (element) => {
          if (!element || typeof element.getBoundingClientRect !== 'function') return null;
          return getRectOnSlide(element.getBoundingClientRect(), metrics);
        }
      });
    };
  }

  return {
    getStudioBoundableSelection,
    getStudioMarqueeSelection,
    buildStudioSelectionBounds,
    createStudioSelectionBoundsResolver
  };
});
