(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorClipboardSelectionRuntime = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function createStudioEditorClipboardSelectionRuntime(options = {}) {
    const controllerApi = options.controllerApi
      || (root && root.SlideNextStudioEditorClipboardSelectionController)
      || null;
    const selectionController = controllerApi
      && typeof controllerApi.createStudioEditorClipboardSelectionController === 'function'
      ? controllerApi.createStudioEditorClipboardSelectionController({
          clipboardApi: options.clipboardApi
            || (root && root.SlideNextStudioEditorClipboard)
            || null,
          getIframeDoc: options.getIframeDoc,
          getActiveSlide: options.getActiveSlide,
          getSelectedElements: options.getSelectedElements,
          getClipboard: options.getClipboard,
          isElementLocked: options.isElementLocked,
          getCanonicalVisibilityReader: options.getCanonicalVisibilityReader,
          buildPayload: options.buildPayload
        })
      : null;

    return {
      selectionController
    };
  }

  return {
    createStudioEditorClipboardSelectionRuntime
  };
});
