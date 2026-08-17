(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorOverlayAccessors = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function createStudioEditorOverlayAccessors(options = {}) {
    const getOverlay = typeof options.getOverlay === 'function'
      ? options.getOverlay
      : () => options.overlay || null;
    const getDocument = typeof options.getDocument === 'function'
      ? options.getDocument
      : () => null;
    const getActiveSlide = typeof options.getActiveSlide === 'function'
      ? options.getActiveSlide
      : () => null;
    const getOverlayOptions = typeof options.getOverlayOptions === 'function'
      ? options.getOverlayOptions
      : () => options.overlayOptions || {};

    function renderMarqueeSelection(rect) {
      const overlay = getOverlay();
      if (!overlay
        || typeof overlay.renderStudioMarqueeSelectionForActiveSlide !== 'function') {
        return false;
      }
      return overlay.renderStudioMarqueeSelectionForActiveSlide({
        documentRef: getDocument(),
        getActiveSlide,
        rect,
        ...(getOverlayOptions() || {})
      });
    }

    return { renderMarqueeSelection };
  }

  return { createStudioEditorOverlayAccessors };
});
