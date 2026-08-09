(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorFrameInteractionStateController = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function createStudioEditorFrameInteractionStateController(options = {}) {
    let isDraggingElement = !!options.initialIsDraggingElement;
    let suppressNextFrameClick = !!options.initialSuppressNextFrameClick;

    return {
      getIsDraggingElement() {
        return isDraggingElement;
      },
      setIsDraggingElement(nextValue) {
        isDraggingElement = !!nextValue;
        return isDraggingElement;
      },
      getSuppressNextFrameClick() {
        return suppressNextFrameClick;
      },
      setSuppressNextFrameClick(nextValue) {
        suppressNextFrameClick = !!nextValue;
        return suppressNextFrameClick;
      },
      consumeClickSuppression() {
        const shouldSuppress = suppressNextFrameClick;
        suppressNextFrameClick = false;
        return shouldSuppress;
      },
      clear() {
        isDraggingElement = false;
        suppressNextFrameClick = false;
      }
    };
  }

  return {
    createStudioEditorFrameInteractionStateController
  };
});
