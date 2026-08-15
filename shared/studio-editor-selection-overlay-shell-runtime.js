(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorSelectionOverlayShellRuntime = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function resolveApi(options, optionName, globalName) {
    if (Object.prototype.hasOwnProperty.call(options, optionName)) {
      return options[optionName];
    }
    return root && root[globalName] ? root[globalName] : null;
  }

  function createStudioEditorSelectionOverlayShellRuntime(options = {}) {
    const overlayApi = resolveApi(options, 'overlayApi', 'SlideNextStudioEditorOverlay');
    const overlayStateApi = resolveApi(
      options,
      'overlayStateApi',
      'SlideNextStudioEditorOverlayState'
    );
    const synchronizer = overlayApi
      && typeof overlayApi.createStudioSelectionOverlaySynchronizer === 'function'
      ? overlayApi.createStudioSelectionOverlaySynchronizer({
          overlayApi,
          overlayStateApi,
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
      sync: (doc) => typeof synchronizer === 'function' ? synchronizer(doc) : false
    };
  }

  return {
    createStudioEditorSelectionOverlayShellRuntime
  };
});
