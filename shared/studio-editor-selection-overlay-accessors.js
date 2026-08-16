(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorSelectionOverlayAccessors = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function createStudioEditorSelectionOverlayAccessors(options = {}) {
    const runtimeApi = Object.prototype.hasOwnProperty.call(options, 'runtimeApi')
      ? options.runtimeApi
      : root && root.SlideNextStudioEditorSelectionOverlayShellRuntime;
    const runtime = runtimeApi
      && typeof runtimeApi.createStudioEditorSelectionOverlayShellRuntime === 'function'
      ? runtimeApi.createStudioEditorSelectionOverlayShellRuntime({
          overlayApi: options.overlayApi,
          overlayStateApi: options.overlayStateApi,
          getCurrentDocument: options.getCurrentDocument,
          getActiveSlide: options.getActiveSlide,
          getSelectedElements: options.getSelectedElements,
          getOverlayOptions: options.getOverlayOptions,
          getHiddenStateReader: options.getHiddenStateReader,
          getSelectionBounds: options.getSelectionBounds,
          getTransformSelectionState: options.getTransformSelectionState,
          hideGuides: options.hideGuides,
          hideDragHud: options.hideDragHud
        })
      : null;

    return {
      runtime,
      sync: (doc) => runtime && typeof runtime.sync === 'function'
        ? runtime.sync(doc)
        : false
    };
  }

  return { createStudioEditorSelectionOverlayAccessors };
});
