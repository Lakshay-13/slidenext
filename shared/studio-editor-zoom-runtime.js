(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorZoomRuntime = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function createStudioEditorZoomRuntime(options = {}) {
    const controllerApi = options.controllerApi
      || (root && root.SlideNextStudioEditorZoomController)
      || null;
    const zoomController = controllerApi
      && typeof controllerApi.createStudioEditorZoomController === 'function'
      ? controllerApi.createStudioEditorZoomController({
          zoomApi: options.zoomApi
            || (root && root.SlideNextStudioEditorZoom)
            || null,
          rulerViewApi: options.rulerViewApi
            || (root && root.SlideNextStudioEditorRulerView)
            || null,
          documentRef: options.documentRef,
          localStorageRef: options.localStorageRef,
          initialZoomFactor: options.initialZoomFactor,
          resolveActionState: options.resolveActionState,
          getZoomFactor: options.getZoomFactor,
          setZoomFactor: options.setZoomFactor,
          applyZoom: options.applyZoom
        })
      : null;

    return {
      zoomController
    };
  }

  return {
    createStudioEditorZoomRuntime
  };
});
