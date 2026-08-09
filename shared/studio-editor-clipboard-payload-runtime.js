(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorClipboardPayloadRuntime = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function createStudioEditorClipboardPayloadRuntime(options = {}) {
    const controllerApi = options.controllerApi
      || (root && root.SlideNextStudioEditorClipboardPayloadController)
      || null;
    const payloadController = controllerApi
      && typeof controllerApi.createStudioEditorClipboardPayloadController === 'function'
      ? controllerApi.createStudioEditorClipboardPayloadController({
          clipboardApi: options.clipboardApi
            || (root && root.SlideNextStudioEditorClipboard)
            || null,
          domApi: options.domApi
            || (root && root.SlideNextStudioEditorDom)
            || null,
          transformApi: options.transformApi
            || (root && root.SlideNextStudioEditorTransform)
            || null,
          getIframeDoc: options.getIframeDoc,
          getActiveSlide: options.getActiveSlide,
          getSlideMetrics: options.getSlideMetrics,
          getNormalizedSlideLayerOrder: options.getNormalizedSlideLayerOrder,
          sanitizeElement: options.sanitizeElement,
          getRectOnSlide: options.getRectOnSlide,
          getClosestPositionedAncestor: options.getClosestPositionedAncestor,
          buildPositionedLayoutItem: options.buildPositionedLayoutItem
        })
      : null;

    return {
      payloadController
    };
  }

  return {
    createStudioEditorClipboardPayloadRuntime
  };
});
