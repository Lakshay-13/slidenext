(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorClipboardPayloadController = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function createStudioEditorClipboardPayloadController(options = {}) {
    const hasOption = (name) => Object.prototype.hasOwnProperty.call(options, name);
    const resolveDependency = (name, globalName) => hasOption(name)
      ? options[name]
      : (root && root[globalName]) || null;
    const clipboardApi = resolveDependency('clipboardApi', 'SlideNextStudioEditorClipboard');
    const domApi = resolveDependency('domApi', 'SlideNextStudioEditorDom');
    const transformApi = resolveDependency('transformApi', 'SlideNextStudioEditorTransform');
    const getIframeDoc = typeof options.getIframeDoc === 'function'
      ? options.getIframeDoc
      : () => null;
    const getActiveSlide = typeof options.getActiveSlide === 'function'
      ? options.getActiveSlide
      : () => null;
    const getSlideMetrics = typeof options.getSlideMetrics === 'function'
      ? options.getSlideMetrics
      : () => null;
    const getNormalizedSlideLayerOrder = typeof options.getNormalizedSlideLayerOrder === 'function'
      ? options.getNormalizedSlideLayerOrder
      : () => null;
    const sanitizeElement = typeof options.sanitizeElement === 'function'
      ? options.sanitizeElement
      : () => {};
    const getRectOnSlide = typeof options.getRectOnSlide === 'function'
      ? options.getRectOnSlide
      : () => null;
    const getClosestPositionedAncestor = typeof options.getClosestPositionedAncestor === 'function'
      ? options.getClosestPositionedAncestor
      : domApi && typeof domApi.getStudioClosestPositionedAncestor === 'function'
        ? domApi.getStudioClosestPositionedAncestor
        : () => null;
    const buildPositionedLayoutItem = typeof options.buildPositionedLayoutItem === 'function'
      ? options.buildPositionedLayoutItem
      : transformApi && typeof transformApi.buildStudioPositionedLayoutItem === 'function'
        ? transformApi.buildStudioPositionedLayoutItem
        : () => null;

    function buildPayload(elements = [], doc = getIframeDoc()) {
      const resolvedDoc = doc || getIframeDoc();
      const selection = Array.isArray(elements) ? elements : [];
      if (!resolvedDoc
        || !getActiveSlide(resolvedDoc)
        || selection.length === 0
        || !clipboardApi
        || typeof clipboardApi.getStudioClipboardSelection !== 'function'
        || typeof clipboardApi.buildStudioClipboardPayloadItems !== 'function') {
        return [];
      }

      const slide = getActiveSlide(resolvedDoc);
      const getComputedStyle = resolvedDoc.defaultView
        && typeof resolvedDoc.defaultView.getComputedStyle === 'function'
        ? resolvedDoc.defaultView.getComputedStyle.bind(resolvedDoc.defaultView)
        : null;
      if (!getComputedStyle) return [];

      const slideMetrics = getSlideMetrics(slide);
      const orderedSelection = clipboardApi.getStudioClipboardSelection(selection, {
        orderedElements: getNormalizedSlideLayerOrder(slide)
      });
      if (orderedSelection.length === 0) return [];

      return clipboardApi.buildStudioClipboardPayloadItems(orderedSelection, {
        sanitizeElement,
        hoverableClassName: 'editor-hoverable',
        getComputedStyle,
        getClosestPositionedAncestor,
        buildPositionedLayoutItem,
        positionedLayoutOptions: {
          getClosestPositionedAncestor,
          getRectOnSlide,
          slideMetrics
        }
      });
    }

    return {
      buildPayload,
      buildClipboardPayload: buildPayload
    };
  }

  return {
    createStudioEditorClipboardPayloadController
  };
});
