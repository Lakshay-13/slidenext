(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorLayerOrderRuntime = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function createStudioEditorLayerOrderRuntime(options = {}) {
    const controllerApi = options.controllerApi
      || (root && root.SlideNextStudioEditorLayerOrderController)
      || null;
    const layerOrderController = controllerApi
      && typeof controllerApi.createStudioEditorLayerOrderController === 'function'
      ? controllerApi.createStudioEditorLayerOrderController({
          layerOrderApi: options.layerOrderApi
            || (root && root.SlideNextStudioEditorLayerOrder)
            || null,
          canonicalLayoutApi: options.canonicalLayoutApi
            || (root && root.SlideNextStudioEditorCanonicalLayout)
            || null,
          canonicalDeckApi: options.canonicalDeckApi
            || (root && root.SlideNextCanonicalDeck)
            || null,
          getActiveSlide: options.getActiveSlide,
          getIframeDoc: options.getIframeDoc,
          getNormalizedSlideLayerOrder: options.getNormalizedSlideLayerOrder,
          isElementLocked: options.isElementLocked,
          assignElementId: options.assignElementId,
          buildCanonicalDeckBaseline: options.buildCanonicalDeckBaseline,
          getCanonicalDeckBaseline: options.getCanonicalDeckBaseline,
          applyLayerOrderMutation: options.applyLayerOrderMutation,
          rollbackLayerOrderMutation: options.rollbackLayerOrderMutation
        })
      : null;

    return {
      layerOrderController
    };
  }

  return {
    createStudioEditorLayerOrderRuntime
  };
});
