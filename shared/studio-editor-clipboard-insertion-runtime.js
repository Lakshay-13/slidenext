(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorClipboardInsertionRuntime = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function createStudioEditorClipboardInsertionRuntime(options = {}) {
    const controllerApi = options.controllerApi
      || (root && root.SlideNextStudioEditorClipboardInsertionController)
      || null;
    const insertionController = controllerApi
      && typeof controllerApi.createStudioEditorClipboardInsertionController === 'function'
      ? controllerApi.createStudioEditorClipboardInsertionController({
          clipboardApi: options.clipboardApi
            || (root && root.SlideNextStudioEditorClipboard)
            || null,
          mutationApi: options.mutationApi
            || (root && root.SlideNextStudioEditorClipboardMutation)
            || null,
          transactionApi: options.transactionApi
            || (root && root.SlideNextStudioEditorTransaction)
            || null,
          getIframeDoc: options.getIframeDoc,
          getActiveSlide: options.getActiveSlide,
          getSlideMetrics: options.getSlideMetrics,
          makeElementsHoverable: options.makeElementsHoverable,
          getRectOnSlide: options.getRectOnSlide,
          getOffsetPx: options.getOffsetPx,
          getElementId: options.getElementId
        })
      : null;

    return {
      insertionController
    };
  }

  return {
    createStudioEditorClipboardInsertionRuntime
  };
});
